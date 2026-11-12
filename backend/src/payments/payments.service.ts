import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ContractStatus,
  PaymentIntentStatus,
  PlatformRole,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  PAYMENT_GATEWAY,
  PaymentGatewayPort,
} from '../common/payments/payment-gateway.port';
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

    const existing = await this.findByIdempotencyKey(
      tenantId,
      normalizedIdempotencyKey,
    );
    if (existing) {
      return this.toResponse(existing);
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

    const amount = this.parseIntentAmount(amountInput);
    const outstanding = await this.computeOutstanding(tenantId, contract.id);
    if (amount.lte(0) || amount.gt(outstanding)) {
      throw new UnprocessableEntityException(
        'Amount must be greater than 0 and not exceed outstanding balance.',
      );
    }

    const intentId = randomUUID();
    const providerIntent = await this.gateway.createPromptPayIntent({
      tenantId,
      intentId,
      amount: amount.toFixed(2),
      currency: 'THB',
    });

    try {
      const intent = await this.prisma.paymentIntent.create({
        data: {
          id: intentId,
          tenantId,
          contractId: contract.id,
          amount,
          currency: 'THB',
          idempotencyKey: normalizedIdempotencyKey,
          status: PaymentIntentStatus.AWAITING_PROVIDER,
          provider: providerIntent.provider,
          providerRef: providerIntent.providerRef,
          qrPayloadJson: providerIntent.qrPayload as Prisma.InputJsonValue,
          createdByUserId: ctx.userId,
        },
      });
      return this.toResponse(intent);
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        const idempotentIntent = await this.findByIdempotencyKey(
          tenantId,
          normalizedIdempotencyKey,
        );
        if (idempotentIntent) {
          return this.toResponse(idempotentIntent);
        }
      }
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

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
