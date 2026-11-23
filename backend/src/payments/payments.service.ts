import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ContractStatus,
  LedgerDirection,
  LedgerDomain,
  PaymentIntentStatus,
  PaymentTransaction,
  PaymentTransactionStatus,
  PlatformRole,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  PAYMENT_GATEWAY,
  PaymentGatewayPort,
} from '../common/payments/payment-gateway.port';
import { IgnorableStripeEventError } from '../common/payments/stripe-payment.adapter';
import { allocateFifo } from '../common/payments/allocate-fifo';
import { parseThbMoneyString } from '../common/schedule/money';
import { TenantContext } from '../common/tenant/tenant-context';
import { PaymentUnlockOrchestrator } from '../devices/payment-unlock.orchestrator';
import { LineNotifyService } from '../line/line-notify.service';
import { PrismaService } from '../prisma/prisma.service';

type PaymentIntentRecord = Prisma.PaymentIntentGetPayload<
  Record<string, never>
>;

type WebhookIntentLock = Pick<
  PaymentIntentRecord,
  | 'id'
  | 'tenantId'
  | 'contractId'
  | 'amount'
  | 'status'
  | 'provider'
  | 'providerRef'
>;

type ScheduleItemAllocationRow = {
  id: string;
  seq: number;
  totalDue: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  status: ScheduleItemStatus;
};

export type PaymentIntentResponse = {
  id: string;
  tenantId: string;
  contractId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  status: PaymentIntentStatus;
  provider: string;
  providerRef: string | null;
  qrPayload: unknown;
  createdByUserId: string | null;
  createdByCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SandboxWebhookSummary = {
  data: {
    providerEventId: string;
    transactionId: string | null;
    amount: string;
    status: PaymentTransactionStatus | PaymentIntentStatus;
    allocations?: { scheduleItemId: string; amount: string }[];
    replay: boolean;
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    private readonly paymentUnlock: PaymentUnlockOrchestrator,
    private readonly lineNotify: LineNotifyService,
  ) {}

  async createIntent(
    ctx: TenantContext,
    contractId: string,
    amountInput: string,
    idempotencyKey: string | undefined,
  ): Promise<PaymentIntentResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.assertCanCreateIntent(ctx);
    const normalizedIdempotencyKey = this.requireIdempotencyKey(idempotencyKey);
    const amount = this.parseIntentAmount(amountInput);

    const existing = await this.findByIdempotencyKey(
      tenantId,
      normalizedIdempotencyKey,
    );
    if (existing) {
      this.assertIdempotencyPayloadMatches(existing, contractId, amount);
      return this.resolveExistingIntent(tenantId, existing);
    }

    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        tenantId,
        ...(this.isCustomer(ctx) ? { customerId: ctx.customerId ?? undefined } : {}),
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new ConflictException(
        'Payment intents can only be created for ACTIVE contracts.',
      );
    }

    const outstanding = await this.computeOutstanding(tenantId, contract.id);
    if (amount.lte(0) || amount.gt(outstanding)) {
      throw new UnprocessableEntityException(
        'Amount must be greater than 0 and not exceed outstanding balance.',
      );
    }

    const intentId = randomUUID();
    let intent: PaymentIntentRecord;
    try {
      intent = await this.prisma.paymentIntent.create({
        data: {
          id: intentId,
          tenantId,
          contractId: contract.id,
          amount,
          currency: 'THB',
          idempotencyKey: normalizedIdempotencyKey,
          status: PaymentIntentStatus.CREATED,
          provider: 'sandbox',
          providerRef: null,
          qrPayloadJson: Prisma.JsonNull,
          createdByUserId: this.isCustomer(ctx) ? null : ctx.userId,
          createdByCustomerId: this.isCustomer(ctx) ? ctx.customerId : null,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        const idempotentIntent = await this.findByIdempotencyKey(
          tenantId,
          normalizedIdempotencyKey,
        );
        if (idempotentIntent) {
          this.assertIdempotencyPayloadMatches(
            idempotentIntent,
            contractId,
            amount,
          );
          return this.resolveExistingIntent(tenantId, idempotentIntent);
        }
      }
      throw error;
    }

    try {
      const providerIntent = await this.gateway.createPromptPayIntent({
        tenantId,
        intentId: intent.id,
        amount: amount.toFixed(2),
        currency: 'THB',
      });

      const updatedIntent = await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: PaymentIntentStatus.AWAITING_PROVIDER,
          provider: providerIntent.provider,
          providerRef: providerIntent.providerRef,
          qrPayloadJson: providerIntent.qrPayload as Prisma.InputJsonValue,
        },
      });
      return this.toResponse(updatedIntent);
    } catch (error: unknown) {
      await this.markIntentFailed(tenantId, intent.id);
      throw error;
    }
  }

  async getById(
    ctx: TenantContext,
    intentId: string,
  ): Promise<PaymentIntentResponse> {
    const tenantId = this.requireTenantId(ctx);
    const intent = await this.prisma.paymentIntent.findFirst({
      where: {
        id: intentId,
        tenantId,
        ...(this.isCustomer(ctx)
          ? { contract: { customerId: ctx.customerId ?? undefined } }
          : {}),
      },
    });
    if (!intent) {
      throw new NotFoundException('Payment intent not found.');
    }
    return this.toResponse(intent);
  }

  async handleSandboxWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<SandboxWebhookSummary | { ignored: true; type: string }> {
    return this.handleProviderWebhook(rawBody, headers);
  }

  async handleProviderWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<SandboxWebhookSummary | { ignored: true; type: string }> {
    const normalizedHeaders = this.normalizeHeaders(headers);
    if (!this.gateway.verifyWebhookSignature(normalizedHeaders, rawBody)) {
      throw new UnauthorizedException('Invalid payment webhook signature.');
    }

    let event;
    try {
      event = this.gateway.parseWebhookEvent(rawBody);
    } catch (error: unknown) {
      if (error instanceof IgnorableStripeEventError) {
        return { ignored: true, type: error.eventType };
      }
      throw error;
    }
    const amount = this.parseWebhookAmount(event.amount);

    const existing = await this.findTransactionByProviderEventId(
      event.providerEventId,
    );
    if (existing) {
      return this.toTransactionSummary(existing, true);
    }

    try {
      const summary = await this.prisma.$transaction(async (tx) => {
        const intent = await this.lockIntentByProviderRef(
          tx,
          event.providerRef,
        );
        if (!intent) {
          throw new NotFoundException('Payment intent not found for webhook.');
        }
        const replay = await tx.paymentTransaction.findFirst({
          where: { providerEventId: event.providerEventId },
        });
        if (replay) {
          return this.toTransactionSummary(replay, true);
        }
        if (intent.status !== PaymentIntentStatus.AWAITING_PROVIDER) {
          throw new ConflictException(
            'Payment intent is not awaiting provider confirmation.',
          );
        }
        if (intent.amount.toFixed(2) !== amount.toFixed(2)) {
          throw new UnprocessableEntityException(
            'Webhook amount does not match payment intent amount.',
          );
        }

        if (event.status === 'FAILED') {
          const transaction = await tx.paymentTransaction.create({
            data: {
              tenantId: intent.tenantId,
              paymentIntentId: intent.id,
              providerEventId: event.providerEventId,
              amount,
              status: PaymentTransactionStatus.FAILED,
              rawEventJson: event as unknown as Prisma.InputJsonValue,
              verifiedAt: new Date(),
            },
          });

          await tx.paymentIntent.updateMany({
            where: {
              id: intent.id,
              tenantId: intent.tenantId,
              status: PaymentIntentStatus.AWAITING_PROVIDER,
            },
            data: { status: PaymentIntentStatus.FAILED },
          });

          return this.toTransactionSummary(transaction, false);
        }

        const scheduleItems = await this.lockScheduleItemsForAllocation(
          tx,
          intent.tenantId,
          intent.contractId,
        );
        const allocations = allocateFifo(
          scheduleItems.map((item) => ({
            id: item.id,
            seq: item.seq,
            totalDue: item.totalDue.toFixed(2),
            amountPaid: item.amountPaid.toFixed(2),
            status: item.status,
          })),
          amount.toFixed(2),
        );

        const transaction = await tx.paymentTransaction.create({
          data: {
            tenantId: intent.tenantId,
            paymentIntentId: intent.id,
            providerEventId: event.providerEventId,
            amount,
            status: PaymentTransactionStatus.SUCCEEDED,
            rawEventJson: event as unknown as Prisma.InputJsonValue,
            verifiedAt: new Date(),
          },
        });

        for (const allocation of allocations) {
          await tx.paymentScheduleItem.update({
            where: { id: allocation.scheduleItemId },
            data: {
              amountPaid: new Prisma.Decimal(allocation.nextAmountPaid),
              status: allocation.nextStatus,
            },
          });
        }

        if (allocations.length > 0) {
          await tx.allocation.createMany({
            data: allocations.map((allocation) => ({
              tenantId: intent.tenantId,
              paymentTransactionId: transaction.id,
              scheduleItemId: allocation.scheduleItemId,
              amount: new Prisma.Decimal(allocation.amount),
            })),
          });
        }

        await tx.ledgerEntry.createMany({
          data: [
            {
              tenantId: intent.tenantId,
              paymentTransactionId: transaction.id,
              domain: LedgerDomain.INSTALLMENT,
              direction: LedgerDirection.DEBIT,
              accountCode: 'CASH_CLEARING',
              amount,
            },
            {
              tenantId: intent.tenantId,
              paymentTransactionId: transaction.id,
              domain: LedgerDomain.INSTALLMENT,
              direction: LedgerDirection.CREDIT,
              accountCode: 'INSTALLMENT_RECEIVABLE',
              amount,
            },
          ],
        });

        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: { status: PaymentIntentStatus.SUCCEEDED },
        });

        return {
          data: {
            providerEventId: transaction.providerEventId,
            transactionId: transaction.id,
            amount: transaction.amount.toFixed(2),
            status: transaction.status,
            allocations: allocations.map((allocation) => ({
              scheduleItemId: allocation.scheduleItemId,
              amount: allocation.amount,
            })),
            replay: false,
            tenantId: intent.tenantId,
            contractId: intent.contractId,
          },
        };
      });

      if (
        summary.data.status === PaymentTransactionStatus.SUCCEEDED &&
        !summary.data.replay &&
        'tenantId' in summary.data &&
        'contractId' in summary.data
      ) {
        try {
          await this.paymentUnlock.onVerifiedPayment({
            tenantId: summary.data.tenantId as string,
            contractId: summary.data.contractId as string,
            paymentTransactionId: summary.data.transactionId,
          });
        } catch (unlockError: unknown) {
          this.logger.error(
            `payment-unlock failed tx=${summary.data.transactionId}`,
            unlockError instanceof Error ? unlockError.stack : undefined,
          );
        }
        try {
          await this.lineNotify.onVerifiedPayment({
            tenantId: summary.data.tenantId as string,
            contractId: summary.data.contractId as string,
            paymentTransactionId: summary.data.transactionId,
            amount: summary.data.amount,
          });
        } catch (lineError: unknown) {
          this.logger.error(
            `line-notify failed tx=${summary.data.transactionId}`,
            lineError instanceof Error ? lineError.stack : undefined,
          );
        }
      }

      const { tenantId: _t, contractId: _c, ...publicData } = summary.data as {
        providerEventId: string;
        transactionId: string;
        amount: string;
        status: PaymentTransactionStatus;
        allocations: { scheduleItemId: string; amount: string }[];
        replay: boolean;
        tenantId?: string;
        contractId?: string;
      };
      return { data: publicData };
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        const replay = await this.findTransactionByProviderEventId(
          event.providerEventId,
        );
        if (replay) {
          return this.toTransactionSummary(replay, true);
        }
      }
      throw error;
    }
  }

  private async computeOutstanding(
    tenantId: string,
    contractId: string,
  ): Promise<Prisma.Decimal> {
    const items = await this.prisma.paymentScheduleItem.findMany({
      where: {
        tenantId,
        contractId,
        status: { not: ScheduleItemStatus.PAID },
      },
      select: {
        totalDue: true,
        amountPaid: true,
      },
    });

    return items.reduce((total, item) => {
      const itemOutstanding = item.totalDue.minus(item.amountPaid);
      if (itemOutstanding.lte(0)) {
        return total;
      }
      return total.plus(itemOutstanding);
    }, new Prisma.Decimal('0.00'));
  }

  private async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<PaymentIntentRecord | null> {
    return this.prisma.paymentIntent.findFirst({
      where: {
        tenantId,
        idempotencyKey,
      },
    });
  }

  private async findById(
    tenantId: string,
    intentId: string,
  ): Promise<PaymentIntentRecord | null> {
    return this.prisma.paymentIntent.findFirst({
      where: {
        id: intentId,
        tenantId,
      },
    });
  }

  private async findTransactionByProviderEventId(
    providerEventId: string,
  ): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({
      where: { providerEventId },
    });
  }

  private async lockIntentByProviderRef(
    tx: Prisma.TransactionClient,
    providerRef: string,
  ): Promise<WebhookIntentLock | null> {
    const rows = await tx.$queryRaw<WebhookIntentLock[]>`
      SELECT
        id,
        tenant_id AS "tenantId",
        contract_id AS "contractId",
        amount,
        status,
        provider,
        provider_ref AS "providerRef"
      FROM payment_intents
      WHERE provider = 'sandbox'
        AND provider_ref = ${providerRef}
      ORDER BY id
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  private async lockScheduleItemsForAllocation(
    tx: Prisma.TransactionClient,
    tenantId: string,
    contractId: string,
  ): Promise<ScheduleItemAllocationRow[]> {
    return tx.$queryRaw<ScheduleItemAllocationRow[]>`
      SELECT
        id,
        seq,
        total_due AS "totalDue",
        amount_paid AS "amountPaid",
        status
      FROM payment_schedule_items
      WHERE tenant_id = ${tenantId}::uuid
        AND contract_id = ${contractId}::uuid
      ORDER BY seq
      FOR UPDATE
    `;
  }

  private async resolveExistingIntent(
    tenantId: string,
    intent: PaymentIntentRecord,
  ): Promise<PaymentIntentResponse> {
    if (
      intent.status !== PaymentIntentStatus.CREATED &&
      intent.status !== PaymentIntentStatus.FAILED
    ) {
      return this.toResponse(intent);
    }

    return this.resumeProviderSetup(tenantId, intent);
  }

  private async resumeProviderSetup(
    tenantId: string,
    intent: PaymentIntentRecord,
  ): Promise<PaymentIntentResponse> {
    let providerIntent: Awaited<
      ReturnType<PaymentGatewayPort['createPromptPayIntent']>
    >;
    try {
      providerIntent = await this.gateway.createPromptPayIntent({
        tenantId,
        intentId: intent.id,
        amount: intent.amount.toFixed(2),
        currency: 'THB',
      });
    } catch (error: unknown) {
      await this.markIntentFailed(tenantId, intent.id);
      const currentIntent = await this.findById(tenantId, intent.id);
      if (
        currentIntent?.status === PaymentIntentStatus.AWAITING_PROVIDER &&
        currentIntent.providerRef
      ) {
        return this.toResponse(currentIntent);
      }
      throw error;
    }

    const updateResult = await this.prisma.paymentIntent.updateMany({
      where: {
        id: intent.id,
        tenantId,
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: {
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        provider: providerIntent.provider,
        providerRef: providerIntent.providerRef,
        qrPayloadJson: providerIntent.qrPayload as Prisma.InputJsonValue,
      },
    });

    const currentIntent = await this.findById(tenantId, intent.id);
    if (!currentIntent) {
      throw new NotFoundException('Payment intent not found.');
    }
    if (updateResult.count === 0) {
      return this.toResponse(currentIntent);
    }

    return this.toResponse(currentIntent);
  }

  private parseIntentAmount(amount: string): Prisma.Decimal {
    try {
      return parseThbMoneyString(amount, 'amount');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private parseWebhookAmount(amount: string): Prisma.Decimal {
    try {
      return parseThbMoneyString(amount, 'webhook amount');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private assertIdempotencyPayloadMatches(
    intent: PaymentIntentRecord,
    contractId: string,
    amount: Prisma.Decimal,
  ): void {
    if (
      intent.contractId !== contractId ||
      intent.amount.toFixed(2) !== amount.toFixed(2)
    ) {
      throw new ConflictException(
        'Idempotency-Key has already been used with a different payment intent payload.',
      );
    }
  }

  private async markIntentFailed(
    tenantId: string,
    intentId: string,
  ): Promise<void> {
    await this.prisma.paymentIntent.updateMany({
      where: {
        id: intentId,
        tenantId,
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: {
        status: PaymentIntentStatus.FAILED,
      },
    });
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private isCustomer(ctx: TenantContext): boolean {
    return ctx.audience === 'customer';
  }

  private assertCanCreateIntent(ctx: TenantContext): void {
    if (this.isCustomer(ctx)) {
      if (!ctx.customerId) {
        throw new ForbiddenException('Customer context required.');
      }
      return;
    }
    this.requireMutateRole(ctx);
  }

  private requireMutateRole(ctx: TenantContext): void {
    if (
      ctx.role !== PlatformRole.MERCHANT_OWNER &&
      ctx.role !== PlatformRole.MERCHANT_STAFF
    ) {
      throw new ForbiddenException(
        'Only merchant staff can create payment intents.',
      );
    }
  }

  private requireIdempotencyKey(idempotencyKey: string | undefined): string {
    const normalized = idempotencyKey?.trim();
    if (!normalized) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    return normalized;
  }

  private toResponse(intent: PaymentIntentRecord): PaymentIntentResponse {
    return {
      id: intent.id,
      tenantId: intent.tenantId,
      contractId: intent.contractId,
      amount: intent.amount.toFixed(2),
      currency: intent.currency,
      idempotencyKey: intent.idempotencyKey,
      status: intent.status,
      provider: intent.provider,
      providerRef: intent.providerRef,
      qrPayload: intent.qrPayloadJson,
      createdByUserId: intent.createdByUserId,
      createdByCustomerId: intent.createdByCustomerId,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt,
    };
  }

  private toTransactionSummary(
    transaction: PaymentTransaction,
    replay: boolean,
  ): SandboxWebhookSummary {
    return {
      data: {
        providerEventId: transaction.providerEventId,
        transactionId: transaction.id,
        amount: transaction.amount.toFixed(2),
        status: transaction.status,
        replay,
      },
    };
  }

  private normalizeHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(headers).flatMap(([key, value]) => {
        if (typeof value === 'string') {
          return [[key, value]];
        }
        if (Array.isArray(value) && value.length > 0) {
          return [[key, value[0]]];
        }
        return [];
      }),
    );
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
