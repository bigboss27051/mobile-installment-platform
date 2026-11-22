import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceAuditAction,
  DeviceCommandType,
  DeviceLockApprovalStatus,
  Prisma,
} from '@prisma/client';
import { hasPermission } from '../common/authz/permissions';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceCommandsService } from './device-commands.service';

@Injectable()
export class DeviceLockApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: DeviceCommandsService,
  ) {}

  async list(ctx: TenantContext, statusRaw = 'PENDING') {
    this.requireCommand(ctx);
    const tenantId = this.requireTenant(ctx);
    const status = this.parseStatus(statusRaw);
    const rows = await this.prisma.deviceLockApproval.findMany({
      where: { tenantId, status },
      include: { device: { include: { imeiUnit: true } } },
      orderBy: { requestedAt: 'asc' },
      take: 100,
    });
    return rows.map((row) => {
      const imei = row.device.imeiUnit?.imei;
      const maskedImei =
        imei && imei.length > 4 ? `••••${imei.slice(-4)}` : null;
      return {
        id: row.id,
        deviceId: row.deviceId,
        contractId: row.contractId,
        status: row.status,
        overdueDays: row.overdueDays,
        reason: row.reason,
        requestedAt: row.requestedAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        maskedImei,
      };
    });
  }

  async approve(
    ctx: TenantContext,
    approvalId: string,
    reasonRaw: string,
    idempotencyKey: string,
  ) {
    this.requireCommand(ctx);
    const tenantId = this.requireTenant(ctx);
    const reason = reasonRaw?.trim();
    if (!reason) throw new BadRequestException('REASON_REQUIRED');
    const key = idempotencyKey?.trim();
    if (!key) throw new BadRequestException('Idempotency-Key header is required.');

    const byKey = await this.prisma.deviceLockApproval.findFirst({
      where: { tenantId, resolveIdempotencyKey: key },
    });
    if (byKey) {
      return {
        id: byKey.id,
        status: byKey.status,
        commandId: null as string | null,
        replay: true,
      };
    }

    const pending = await this.prisma.deviceLockApproval.findFirst({
      where: {
        id: approvalId,
        tenantId,
        status: DeviceLockApprovalStatus.PENDING,
      },
    });
    if (!pending) {
      throw new NotFoundException('LOCK_APPROVAL_NOT_FOUND');
    }

    const command = await this.commands.enqueue(ctx, pending.deviceId, {
      type: DeviceCommandType.START_LOCK_TASK,
      reason: `${reason} | lock-approval:${pending.id}`,
    });

    try {
      const updated = await this.prisma.deviceLockApproval.update({
        where: { id: pending.id },
        data: {
          status: DeviceLockApprovalStatus.APPROVED,
          resolvedAt: new Date(),
          resolvedByUserId: ctx.userId,
          resolveIdempotencyKey: key,
          reason: `${pending.reason} | approve: ${reason}`,
        },
      });
      await this.prisma.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: pending.deviceId,
          actorUserId: ctx.userId!,
          action: DeviceAuditAction.LOCK_APPROVAL,
          reason: `APPROVED ${pending.id} | ${reason}`,
        },
      });
      return {
        id: updated.id,
        status: updated.status,
        commandId: command.id,
        replay: false,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.prisma.deviceLockApproval.findFirst({
          where: { tenantId, resolveIdempotencyKey: key },
        });
        if (winner) {
          return {
            id: winner.id,
            status: winner.status,
            commandId: command.id,
            replay: true,
          };
        }
      }
      throw error;
    }
  }

  async reject(
    ctx: TenantContext,
    approvalId: string,
    reasonRaw: string,
    idempotencyKey: string,
  ) {
    this.requireCommand(ctx);
    const tenantId = this.requireTenant(ctx);
    const reason = reasonRaw?.trim();
    if (!reason) throw new BadRequestException('REASON_REQUIRED');
    const key = idempotencyKey?.trim();
    if (!key) throw new BadRequestException('Idempotency-Key header is required.');

    const byKey = await this.prisma.deviceLockApproval.findFirst({
      where: { tenantId, resolveIdempotencyKey: key },
    });
    if (byKey) {
      return { id: byKey.id, status: byKey.status, replay: true };
    }

    const pending = await this.prisma.deviceLockApproval.findFirst({
      where: {
        id: approvalId,
        tenantId,
        status: DeviceLockApprovalStatus.PENDING,
      },
    });
    if (!pending) {
      throw new NotFoundException('LOCK_APPROVAL_NOT_FOUND');
    }

    try {
      const updated = await this.prisma.deviceLockApproval.update({
        where: { id: pending.id },
        data: {
          status: DeviceLockApprovalStatus.REJECTED,
          resolvedAt: new Date(),
          resolvedByUserId: ctx.userId,
          resolveIdempotencyKey: key,
          reason: `${pending.reason} | reject: ${reason}`,
        },
      });
      await this.prisma.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: pending.deviceId,
          actorUserId: ctx.userId!,
          action: DeviceAuditAction.LOCK_APPROVAL,
          reason: `REJECTED ${pending.id} | ${reason}`,
        },
      });
      return { id: updated.id, status: updated.status, replay: false };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.prisma.deviceLockApproval.findFirst({
          where: { tenantId, resolveIdempotencyKey: key },
        });
        if (winner) {
          return { id: winner.id, status: winner.status, replay: true };
        }
      }
      throw error;
    }
  }

  async cancelPendingForDevice(
    tenantId: string,
    deviceId: string,
    cancelReason: string,
  ): Promise<number> {
    const result = await this.prisma.deviceLockApproval.updateMany({
      where: {
        tenantId,
        deviceId,
        status: DeviceLockApprovalStatus.PENDING,
      },
      data: {
        status: DeviceLockApprovalStatus.CANCELLED,
        resolvedAt: new Date(),
        reason: cancelReason,
      },
    });
    return result.count;
  }

  private parseStatus(raw: string): DeviceLockApprovalStatus {
    const upper = raw.trim().toUpperCase();
    if (
      upper === DeviceLockApprovalStatus.PENDING ||
      upper === DeviceLockApprovalStatus.APPROVED ||
      upper === DeviceLockApprovalStatus.REJECTED ||
      upper === DeviceLockApprovalStatus.CANCELLED
    ) {
      return upper;
    }
    throw new BadRequestException('INVALID_STATUS');
  }

  private requireCommand(ctx: TenantContext) {
    if (!hasPermission(ctx.role, 'devices.command')) {
      throw new ForbiddenException('PERMISSION_DENIED');
    }
  }

  private requireTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    return ctx.tenantId;
  }
}
