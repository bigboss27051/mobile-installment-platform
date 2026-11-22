import { Injectable, Logger } from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceBindingStatus,
  DeviceCommandType,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceCommandsService } from './device-commands.service';
import { DeviceLockApprovalService } from './device-lock-approval.service';
import {
  desiredFromOutstanding,
  unlockCommandsForDesired,
} from './device-lock-policy';

export type VerifiedPaymentUnlockInput = {
  tenantId: string;
  contractId: string;
  paymentTransactionId: string;
  /** Staff/system actor for command audit; falls back to binding actor if omitted. */
  actorUserId?: string;
};

@Injectable()
export class PaymentUnlockOrchestrator {
  private readonly logger = new Logger(PaymentUnlockOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: DeviceCommandsService,
    private readonly lockApprovals: DeviceLockApprovalService,
  ) {}

  async onVerifiedPayment(input: VerifiedPaymentUnlockInput): Promise<{
    applied: boolean;
    reason: string;
    commandIds: string[];
  }> {
    const outstanding = await this.computeOutstanding(
      input.tenantId,
      input.contractId,
    );
    const target = desiredFromOutstanding(outstanding);
    if (target !== DesiredPresentation.NONE) {
      return {
        applied: false,
        reason: 'OUTSTANDING_REMAINS',
        commandIds: [],
      };
    }

    const binding = await this.prisma.deviceContractBinding.findFirst({
      where: {
        tenantId: input.tenantId,
        contractId: input.contractId,
        status: DeviceBindingStatus.ACTIVE,
      },
      include: {
        device: {
          include: { policyState: true },
        },
      },
      orderBy: { boundAt: 'desc' },
    });
    if (!binding?.device || binding.device.platform !== 'ANDROID') {
      return {
        applied: false,
        reason: 'NO_ANDROID_BINDING',
        commandIds: [],
      };
    }

    const marker = `pay:${input.paymentTransactionId}`;
    const already = await this.prisma.deviceAuditEvent.findFirst({
      where: {
        tenantId: input.tenantId,
        deviceId: binding.deviceId,
        reason: { contains: marker },
      },
    });
    if (already) {
      return {
        applied: false,
        reason: 'ALREADY_APPLIED',
        commandIds: [],
      };
    }

    await this.lockApprovals.cancelPendingForDevice(
      input.tenantId,
      binding.deviceId,
      `cancel:payment-unlock pay:${input.paymentTransactionId}`,
    );

    const desired =
      binding.device.policyState?.desiredPresentation ??
      DesiredPresentation.NONE;
    const types = unlockCommandsForDesired(desired);
    if (types.length === 0) {
      return {
        applied: false,
        reason: 'ALREADY_NONE',
        commandIds: [],
      };
    }

    const actorUserId = input.actorUserId ?? binding.actorUserId;
    const commandIds: string[] = [];
    for (const type of types) {
      const command = await this.commands.enqueue(
        {
          userId: actorUserId,
          tenantId: input.tenantId,
          role: 'MERCHANT_OWNER',
        } as never,
        binding.deviceId,
        {
          type: type as DeviceCommandType,
          reason: `payment-unlock ${marker}`,
        },
      );
      commandIds.push(command.id);
    }

    this.logger.log(
      `payment unlock applied device=${binding.deviceId} tx=${input.paymentTransactionId} commands=${commandIds.length}`,
    );
    return { applied: true, reason: 'UNLOCK_QUEUED', commandIds };
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
      select: { totalDue: true, amountPaid: true },
    });
    return items.reduce((total, item) => {
      const left = item.totalDue.minus(item.amountPaid);
      return left.lte(0) ? total : total.plus(left);
    }, new Prisma.Decimal('0.00'));
  }
}
