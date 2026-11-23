import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DeviceAuditAction, TenantDevicePolicySettings } from '@prisma/client';
import { hasPermission } from '../common/authz/permissions';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_DEVICE_POLICY_SETTINGS,
  DevicePolicySettingsInput,
  validateDevicePolicySettingsInput,
} from './device-policy-settings';

export type PublicDevicePolicySettings = DevicePolicySettingsInput & {
  tenantId: string;
};

@Injectable()
export class DevicePolicySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(ctx: TenantContext): Promise<PublicDevicePolicySettings> {
    this.requireConfig(ctx);
    const tenantId = this.requireTenant(ctx);
    return this.toPublic(await this.getOrCreateInternal(tenantId));
  }

  /** Internal: no RBAC — for orchestrator/cron */
  async getOrCreateInternal(
    tenantId: string,
  ): Promise<TenantDevicePolicySettings> {
    const existing = await this.prisma.tenantDevicePolicySettings.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;
    return this.prisma.tenantDevicePolicySettings.create({
      data: { tenantId, ...DEFAULT_DEVICE_POLICY_SETTINGS },
    });
  }

  async update(
    ctx: TenantContext,
    input: DevicePolicySettingsInput,
  ): Promise<PublicDevicePolicySettings> {
    this.requireConfig(ctx);
    const tenantId = this.requireTenant(ctx);
    const validated = validateDevicePolicySettingsInput(input);
    if (!validated.ok) {
      throw new BadRequestException(validated.code);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenantDevicePolicySettings.upsert({
        where: { tenantId },
        create: { tenantId, ...validated.value },
        update: { ...validated.value },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: null,
          actorUserId: ctx.userId!,
          action: DeviceAuditAction.POLICY_SETTINGS,
          reason: `policy-settings reminder=${validated.value.reminderAfterDays} restrict=${validated.value.restrictAfterDays} lock=${validated.value.lockAfterDays} cron=${validated.value.autoEvaluateCronEnabled} lockApproval=${validated.value.requireLockApproval}`,
        },
      });
      return updated;
    });
    return this.toPublic(row);
  }

  private toPublic(
    row: TenantDevicePolicySettings,
  ): PublicDevicePolicySettings {
    return {
      tenantId: row.tenantId,
      reminderAfterDays: row.reminderAfterDays,
      restrictAfterDays: row.restrictAfterDays,
      lockAfterDays: row.lockAfterDays,
      autoEvaluateCronEnabled: row.autoEvaluateCronEnabled,
      requireLockApproval: row.requireLockApproval,
    };
  }

  private requireConfig(ctx: TenantContext) {
    if (!hasPermission(ctx.role, 'devices.policy.config')) {
      throw new ForbiddenException('PERMISSION_DENIED');
    }
  }

  private requireTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    return ctx.tenantId;
  }
}
