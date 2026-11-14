import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DeviceBindingStatus,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import {
  daysOverdue,
  desiredPresentationFromOverdue,
  remainingBalance,
} from '../devices/lock-presentation';
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

  async getLockStatus(ctx: TenantContext) {
    const { tenantId, customerId } = this.requireCustomer(ctx);
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
    });
    const merchantName = tenant?.name ?? 'Shop';

    const contract = await this.prisma.contract.findFirst({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) {
      return this.emptyLockStatus(merchantName);
    }

    const [scheduleItems, paymentIntents, binding, session] = await Promise.all([
      this.prisma.paymentScheduleItem.findMany({
        where: { tenantId, contractId: contract.id },
        orderBy: { seq: 'asc' },
      }),
      this.prisma.paymentIntent.findMany({
        where: { tenantId, contractId: contract.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
      this.prisma.deviceContractBinding.findFirst({
        where: {
          tenantId,
          contractId: contract.id,
          status: DeviceBindingStatus.ACTIVE,
        },
        include: { device: true },
      }),
      this.prisma.deviceEnrollmentSession.findFirst({
        where: { tenantId, contractId: contract.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const now = new Date();
    let outstanding = new Prisma.Decimal('0.00');
    let maxOverdueDays: number | null = null;
    for (const item of scheduleItems) {
      const leftover = remainingBalance(item.totalDue, item.amountPaid);
      outstanding = outstanding.plus(leftover);
      if (leftover.gt(0)) {
        const overdue = daysOverdue(item.dueDate, now);
        if (overdue > 0 && (maxOverdueDays === null || overdue > maxOverdueDays)) {
          maxOverdueDays = overdue;
        }
      }
    }

    const desiredPresentation = desiredPresentationFromOverdue({
      outstanding,
      maxOverdueDays,
    });
    const latest = paymentIntents[0];
    const osEnforcement = 'NONE' as const;
    const phoneLockedByMdm = false;

    return {
      contractId: contract.id,
      deviceId: binding?.deviceId ?? null,
      platform: binding?.device.platform ?? session?.platform ?? null,
      enrollmentStatus: session?.status ?? 'NOT_ENROLLED',
      desiredPresentation,
      osEnforcement,
      phoneLockedByMdm,
      outstandingBalance: outstanding.toFixed(2),
      currency: contract.currency,
      merchantName,
      latestIntent: latest
        ? {
            id: latest.id,
            status: latest.status,
            qrPayload: latest.qrPayloadJson,
          }
        : null,
      disclaimer:
        desiredPresentation === 'LOCK'
          ? 'This is the installment lock app screen. The iPhone is not in Single App Mode until MDM confirms it.'
          : 'Device OS enforcement is not active. This screen is app UI only.',
    };
  }

  private emptyLockStatus(merchantName: string) {
    return {
      contractId: null,
      deviceId: null,
      platform: null,
      enrollmentStatus: 'NOT_ENROLLED',
      desiredPresentation: 'NONE' as const,
      osEnforcement: 'NONE' as const,
      phoneLockedByMdm: false,
      outstandingBalance: '0.00',
      currency: 'THB',
      merchantName,
      latestIntent: null,
      disclaimer: 'Device OS enforcement is not active. This screen is app UI only.',
    };
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
