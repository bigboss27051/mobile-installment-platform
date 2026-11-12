import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
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
import { allocateFifo } from '../common/payments/allocate-fifo';
import { parseThbMoneyString } from '../common/schedule/money';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

type PaymentIntentRecord = Prisma.PaymentIntentGetPayload<
  Record<string, never>
>;

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
  createdByUserId: string;
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
  ) {}

  async createIntent(
    ctx: TenantContext,
    contractId: string,
    amountInput: string,
    idempotencyKey: string | undefined,
  ): Promise<PaymentIntentResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.requireMutateRole(ctx);
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
          createdByUserId: ctx.userId,
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
  ): Promise<SandboxWebhookSummary> {
    const normalizedHeaders = this.normalizeHeaders(headers);
    if (!this.gateway.verifyWebhookSignature(normalizedHeaders, rawBody)) {
      throw new UnauthorizedException('Invalid sandbox webhook signature.');
    }

    const event = this.gateway.parseWebhookEvent(rawBody);
    const amount = this.parseWebhookAmount(event.amount);

    if (event.status === 'FAILED') {
      await this.markIntentFailedByProviderRef(event.providerRef);
      return {
        data: {
          providerEventId: event.providerEventId,
          transactionId: null,
          amount: amount.toFixed(2),
          status: PaymentIntentStatus.FAILED,
          replay: false,
        },
      };
    }

    const existing = await this.findTransactionByProviderEventId(
      event.providerEventId,
    );
    if (existing) {
      return this.toTransactionSummary(existing, true);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const intent = await tx.paymentIntent.findFirst({
          where: {
            provider: 'sandbox',
            providerRef: event.providerRef,
          },
        });
        if (!intent) {
          throw new NotFoundException('Payment intent not found for webhook.');
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

        const scheduleItems = await tx.paymentScheduleItem.findMany({
          where: {
            tenantId: intent.tenantId,
            contractId: intent.contractId,
          },
          orderBy: { seq: 'asc' },
          select: {
            id: true,
            seq: true,
            totalDue: true,
            amountPaid: true,
            status: true,
          },
        });
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
          },
        };
      });
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

  private async markIntentFailedByProviderRef(providerRef: string): Promise<void> {
    const intent = await this.prisma.paymentIntent.findFirst({
      where: {
        provider: 'sandbox',
        providerRef,
      },
      select: {
        id: true,
        tenantId: true,
      },
    });
    if (!intent) {
      return;
    }

    await this.prisma.paymentIntent.updateMany({
      where: {
        id: intent.id,
        tenantId: intent.tenantId,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
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
