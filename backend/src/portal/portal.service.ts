import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleItemStatus } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

export type PortalScheduleItem = {
  id: string;
  seq: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
  totalDue: string;
  amountPaid: string;
  status: ScheduleItemStatus;
};

export type PortalContractListItem = {
  id: string;
  status: string;
  principal: string;
  financedAmount: string;
  currency: string;
  createdAt: Date;
};

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async listContracts(ctx: TenantContext): Promise<PortalContractListItem[]> {
    const { tenantId, customerId } = this.requireCustomer(ctx);
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((contract) => ({
      id: contract.id,
      status: contract.status,
      principal: contract.principal.toFixed(2),
      financedAmount: contract.financedAmount.toFixed(2),
      currency: contract.currency,
      createdAt: contract.createdAt,
    }));
  }

  async getContract(ctx: TenantContext, contractId: string) {
    const { tenantId, customerId } = this.requireCustomer(ctx);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId, customerId },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }

    const scheduleItems = await this.prisma.paymentScheduleItem.findMany({
      where: { tenantId, contractId: contract.id },
      orderBy: { seq: 'asc' },
    });
    const paymentIntents = await this.prisma.paymentIntent.findMany({
      where: { tenantId, contractId: contract.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      id: contract.id,
      status: contract.status,
      principal: contract.principal.toFixed(2),
      downPayment: contract.downPayment.toFixed(2),
      financedAmount: contract.financedAmount.toFixed(2),
      termMonths: contract.termMonths,
      interestMethod: contract.interestMethod,
      annualRate: contract.annualRate.toFixed(2),
      currency: contract.currency,
      scheduleItems: scheduleItems.map(
        (item): PortalScheduleItem => ({
          id: item.id,
          seq: item.seq,
          dueDate: item.dueDate.toISOString().slice(0, 10),
          principalDue: item.principalDue.toFixed(2),
          interestDue: item.interestDue.toFixed(2),
          feesDue: item.feesDue.toFixed(2),
          totalDue: item.totalDue.toFixed(2),
          amountPaid: item.amountPaid.toFixed(2),
          status: item.status,
        }),
      ),
      paymentIntents: paymentIntents.map((intent) => ({
        id: intent.id,
        amount: intent.amount.toFixed(2),
        status: intent.status,
        qrPayload: intent.qrPayloadJson,
        createdAt: intent.createdAt,
      })),
    };
  }

  createPaymentIntent(
    ctx: TenantContext,
    contractId: string,
    amount: string,
    idempotencyKey: string | undefined,
  ) {
    this.requireCustomer(ctx);
    return this.payments.createIntent(ctx, contractId, amount, idempotencyKey);
  }

  getPaymentIntent(ctx: TenantContext, intentId: string) {
    this.requireCustomer(ctx);
    return this.payments.getById(ctx, intentId);
  }

  private requireCustomer(ctx: TenantContext): {
    tenantId: string;
    customerId: string;
  } {
    if (ctx.audience !== 'customer' || !ctx.tenantId || !ctx.customerId) {
      throw new ForbiddenException('Customer context required.');
    }
    return { tenantId: ctx.tenantId, customerId: ctx.customerId };
  }
}
