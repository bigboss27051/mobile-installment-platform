import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceBindingStatus,
  DeviceCommandStatus,
  DeviceCommandType,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceCommandsService } from './device-commands.service';
import {
  isScheduleOverdue,
  overdueLockMarker,
} from './overdue-lock-policy';

export type EvaluateOverdueSummary = {
  evaluatedAt: string;
  timezone: 'Asia/Bangkok';
  scannedBindings: number;
  locked: Array<{
    deviceId: string;
    contractId: string;
    commandId: string;
    reason: string;
  }>;
  skipped: Array<{
    deviceId: string;
    contractId: string;
    reason: string;
  }>;
  replay: boolean;
};

@Injectable()
export class OverdueLockOrchestrator {
  private readonly logger = new Logger(OverdueLockOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: DeviceCommandsService,
  ) {}

  async evaluateTenant(
    ctx: TenantContext,
    reasonRaw: string,
    idempotencyKey: string,
    now: Date = new Date(),
  ): Promise<EvaluateOverdueSummary> {
    const tenantId = ctx.tenantId;
    if (!tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const reason = reasonRaw?.trim();
    if (!reason) throw new BadRequestException('REASON_REQUIRED');
    const key = idempotencyKey?.trim();
    if (!key) throw new BadRequestException('Idempotency-Key header is required.');

    const existing = await this.prisma.devicePolicyEvaluationRun.findFirst({
      where: { tenantId, idempotencyKey: key },
    });
    if (existing) {
      return {
        ...(existing.summaryJson as EvaluateOverdueSummary),
        replay: true,
      };
    }

    const marker = overdueLockMarker(now);
    const bindings = await this.prisma.deviceContractBinding.findMany({
      where: {
        tenantId,
        status: DeviceBindingStatus.ACTIVE,
        device: { platform: 'ANDROID' },
      },
      include: { device: { include: { policyState: true } } },
    });

    const locked: EvaluateOverdueSummary['locked'] = [];
    const skipped: EvaluateOverdueSummary['skipped'] = [];

    for (const binding of bindings) {
      const deviceId = binding.deviceId;
      const contractId = binding.contractId;

      const items = await this.prisma.paymentScheduleItem.findMany({
        where: {
          tenantId,
          contractId,
          status: { not: ScheduleItemStatus.PAID },
        },
        select: { dueDate: true, status: true },
      });

      if (!isScheduleOverdue(items, now)) {
        skipped.push({ deviceId, contractId, reason: 'NOT_OVERDUE' });
        continue;
      }

      const desired =
        binding.device.policyState?.desiredPresentation ??
        DesiredPresentation.NONE;
      if (desired === DesiredPresentation.LOCK) {
        skipped.push({ deviceId, contractId, reason: 'ALREADY_LOCK' });
        continue;
      }

      const openStart = await this.prisma.deviceCommand.findFirst({
        where: {
          tenantId,
          deviceId,
          type: DeviceCommandType.START_LOCK_TASK,
          status: {
            in: [DeviceCommandStatus.QUEUED, DeviceCommandStatus.SENT],
          },
        },
      });
      if (openStart) {
        skipped.push({
          deviceId,
          contractId,
          reason: 'OPEN_START_LOCK_TASK',
        });
        continue;
      }

      const dayApplied = await this.prisma.deviceAuditEvent.findFirst({
        where: {
          tenantId,
          deviceId,
          reason: { contains: marker },
        },
      });
      if (dayApplied) {
        skipped.push({
          deviceId,
          contractId,
          reason: 'ALREADY_APPLIED_TODAY',
        });
        continue;
      }

      const commandReason = `${reason} | ${marker}`;
      const command = await this.commands.enqueue(ctx, deviceId, {
        type: DeviceCommandType.START_LOCK_TASK,
        reason: commandReason,
      });
      locked.push({
        deviceId,
        contractId,
        commandId: command.id,
        reason: commandReason,
      });
    }

    const summary: EvaluateOverdueSummary = {
      evaluatedAt: now.toISOString(),
      timezone: 'Asia/Bangkok',
      scannedBindings: bindings.length,
      locked,
      skipped,
      replay: false,
    };

    try {
      await this.prisma.devicePolicyEvaluationRun.create({
        data: {
          tenantId,
          idempotencyKey: key,
          actorUserId: ctx.userId,
          reason,
          summaryJson: summary,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        const winner = await this.prisma.devicePolicyEvaluationRun.findFirst({
          where: { tenantId, idempotencyKey: key },
        });
        if (winner) {
          return {
            ...(winner.summaryJson as EvaluateOverdueSummary),
            replay: true,
          };
        }
      }
      throw error;
    }

    this.logger.log(
      `overdue evaluate tenant=${tenantId} scanned=${bindings.length} locked=${locked.length}`,
    );
    return summary;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
