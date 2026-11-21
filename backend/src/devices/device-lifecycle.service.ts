import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ContractStatus,
  DeviceAuditAction,
  DeviceBindingStatus,
  DeviceLifecycleStatus,
  EnrollmentSessionStatus,
  PlatformRole,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVATABLE_SESSION_STATUSES: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.NOT_STARTED,
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.QR_GENERATED,
  EnrollmentSessionStatus.PROVISIONING,
  EnrollmentSessionStatus.ENROLLING,
  EnrollmentSessionStatus.VERIFYING,
  EnrollmentSessionStatus.ACTIVATING,
];

@Injectable()
export class DeviceLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async activate(
    ctx: TenantContext,
    dto: {
      enrollmentSessionId: string;
      contractId: string;
      customerId?: string;
      shopCode?: string;
      reason?: string;
    },
    idempotencyKey: string,
  ) {
    const tenantId = this.requireTenant(ctx);
    const key = this.requireIdempotencyKey(idempotencyKey);
    const reason = dto.reason?.trim() || 'staff-confirmed activation';

    const existingByKey = await this.prisma.deviceActivation.findFirst({
      where: { tenantId, idempotencyKey: key },
      include: { device: true },
    });
    if (existingByKey) {
      if (
        existingByKey.enrollmentSessionId !== dto.enrollmentSessionId ||
        existingByKey.contractId !== dto.contractId
      ) {
        throw new ConflictException(
          'Idempotency-Key has already been used with a different activation payload.',
        );
      }
      return this.toActivationPublic(existingByKey, false);
    }

    const session = await this.prisma.deviceEnrollmentSession.findFirst({
      where: { id: dto.enrollmentSessionId, tenantId },
    });
    if (!session) {
      throw new NotFoundException('Enrollment session not found.');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('ENROLLMENT_EXPIRED');
    }
    if (session.status === EnrollmentSessionStatus.CANCELLED) {
      throw new ConflictException('ENROLLMENT_CANCELLED');
    }
    if (!ACTIVATABLE_SESSION_STATUSES.includes(session.status)) {
      throw new ConflictException('ALREADY_ACTIVATED');
    }
    if (session.contractId !== dto.contractId) {
      throw new ConflictException('CONTRACT_DOES_NOT_MATCH_SESSION');
    }

    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, tenantId },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new ConflictException('CONTRACT_NOT_ACTIVE');
    }
    if (
      contract.imeiUnitId !== session.imeiUnitId ||
      (dto.customerId && dto.customerId !== contract.customerId)
    ) {
      throw new ConflictException(
        dto.customerId && dto.customerId !== contract.customerId
          ? 'CUSTOMER_DOES_NOT_MATCH_CONTRACT'
          : 'IMEI_DOES_NOT_MATCH_CONTRACT',
      );
    }

    if (session.deviceId) {
      throw new ConflictException('ALREADY_ACTIVATED');
    }

    const hardwareFingerprint = createHash('sha256')
      .update(`${tenantId}:${session.imeiUnitId}`)
      .digest('hex');

    const created = await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          tenantId,
          imeiUnitId: session.imeiUnitId,
          platform: session.platform,
          status: DeviceLifecycleStatus.ACTIVE,
          hardwareFingerprint,
        },
      });
      const activation = await tx.deviceActivation.create({
        data: {
          tenantId,
          deviceId: device.id,
          enrollmentSessionId: session.id,
          customerId: contract.customerId,
          contractId: contract.id,
          actorUserId: ctx.userId,
          reason,
          shopCode: dto.shopCode?.trim() || null,
          idempotencyKey: key,
        },
      });
      await tx.deviceEnrollmentSession.update({
        where: { id: session.id },
        data: {
          deviceId: device.id,
          status: EnrollmentSessionStatus.ACTIVATING,
        },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: device.id,
          actorUserId: ctx.userId,
          action: DeviceAuditAction.ACTIVATE,
          reason,
        },
      });
      return { device, activation };
    });

    return this.toActivationPublic(
      {
        ...created.activation,
        device: created.device,
      },
      false,
    );
  }

  async getDashboard(ctx: TenantContext, deviceId: string) {
    const tenantId = this.requireTenant(ctx);
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { enrollmentSession: true, imeiUnit: true, policyState: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found.');
    }
    const imei = device.imeiUnit?.imei;
    const maskedImei =
      imei && imei.length > 4 ? `••••${imei.slice(-4)}` : null;
    return {
      id: device.id,
      platform: device.platform,
      status: device.status,
      enrollmentStatus: device.enrollmentSession?.status ?? 'NOT_ENROLLED',
      desiredPresentation:
        device.policyState?.desiredPresentation ?? ('NONE' as const),
      platformState: device.policyState?.platformState ?? ('NONE' as const),
      policyVersion: device.policyState?.policyVersion ?? 0,
      lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
      outstandingBalance: null as string | null,
      maskedImei,
    };
  }

  async getHeartbeat(ctx: TenantContext, deviceId: string) {
    const tenantId = this.requireTenant(ctx);
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { policyState: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found.');
    }
    if (!device.lastHeartbeatAt) {
      throw new GoneException('HEARTBEAT_NEVER_SEEN');
    }
    const ageMs = Date.now() - device.lastHeartbeatAt.getTime();
    return {
      deviceId: device.id,
      lastHeartbeatAt: device.lastHeartbeatAt.toISOString(),
      policyVersion: device.policyState?.policyVersion ?? 0,
      ageMs,
      fresh: ageMs <= 5 * 60 * 1000,
    };
  }

  async getActivation(ctx: TenantContext, deviceId: string) {
    const tenantId = this.requireTenant(ctx);
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { activation: true },
    });
    if (!device?.activation) {
      throw new NotFoundException('Device activation not found.');
    }
    return this.toActivationPublic({ ...device.activation, device }, false);
  }

  async bindContract(
    ctx: TenantContext,
    deviceId: string,
    dto: { contractId: string; reason: string },
    idempotencyKey: string,
  ) {
    const tenantId = this.requireTenant(ctx);
    const key = this.requireIdempotencyKey(idempotencyKey);
    const reason = this.requireReason(dto.reason);

    const existingByKey = await this.prisma.deviceContractBinding.findFirst({
      where: { tenantId, bindIdempotencyKey: key },
    });
    if (existingByKey) {
      if (existingByKey.deviceId !== deviceId || existingByKey.contractId !== dto.contractId) {
        throw new ConflictException(
          'Idempotency-Key has already been used with a different bind payload.',
        );
      }
      return existingByKey;
    }

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { activation: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found.');
    }
    if (!device.activation) {
      throw new ConflictException('DEVICE_NOT_ACTIVATED');
    }

    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, tenantId },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new ConflictException('CONTRACT_NOT_ACTIVE');
    }
    if (contract.imeiUnitId !== device.imeiUnitId) {
      throw new ConflictException('IMEI_DOES_NOT_MATCH_CONTRACT');
    }

    const active = await this.prisma.deviceContractBinding.findFirst({
      where: {
        tenantId,
        status: DeviceBindingStatus.ACTIVE,
        OR: [{ deviceId: device.id }, { imeiUnitId: device.imeiUnitId }],
      },
    });
    if (active) {
      if (active.deviceId === device.id && active.contractId === contract.id) {
        return active;
      }
      throw new ConflictException('IMEI_BOUND');
    }

    const binding = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deviceContractBinding.create({
        data: {
          tenantId,
          deviceId: device.id,
          contractId: contract.id,
          imeiUnitId: device.imeiUnitId,
          status: DeviceBindingStatus.ACTIVE,
          reason,
          actorUserId: ctx.userId,
          bindIdempotencyKey: key,
        },
      });
      await tx.deviceEnrollmentSession.updateMany({
        where: { deviceId: device.id, tenantId },
        data: { status: EnrollmentSessionStatus.COMPLETED },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: device.id,
          actorUserId: ctx.userId,
          action: DeviceAuditAction.BIND,
          reason,
        },
      });
      return created;
    });
    return binding;
  }

  async unbindContract(
    ctx: TenantContext,
    deviceId: string,
    dto: { reason: string; recoveryRequestId?: string },
    idempotencyKey: string,
  ) {
    const tenantId = this.requireTenant(ctx);
    this.requireElevated(ctx);
    const key = this.requireIdempotencyKey(idempotencyKey);
    const reason = this.requireReason(dto.reason);

    const existingByKey = await this.prisma.deviceContractBinding.findFirst({
      where: { tenantId, unbindIdempotencyKey: key },
    });
    if (existingByKey?.unbindIdempotencyKey === key) {
      return existingByKey;
    }

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('Device not found.');
    }

    const active = await this.prisma.deviceContractBinding.findFirst({
      where: {
        tenantId,
        deviceId: device.id,
        status: DeviceBindingStatus.ACTIVE,
      },
    });
    if (!active) {
      throw new ConflictException('NO_ACTIVE_BIND');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const unbound = await tx.deviceContractBinding.update({
        where: { id: active.id },
        data: {
          status: DeviceBindingStatus.UNBOUND,
          unbindReason: reason,
          unbindActorUserId: ctx.userId,
          unbindIdempotencyKey: key,
          unboundAt: new Date(),
        },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: device.id,
          actorUserId: ctx.userId,
          action: DeviceAuditAction.UNBIND,
          reason,
        },
      });
      return unbound;
    });
    return updated;
  }

  private toActivationPublic(
    row: {
      id: string;
      deviceId: string;
      enrollmentSessionId: string;
      contractId: string;
      customerId: string;
      reason: string;
      shopCode: string | null;
      createdAt: Date;
      device?: { id: string; status: DeviceLifecycleStatus };
    },
    alreadyActivated: boolean,
  ) {
    return {
      id: row.id,
      deviceId: row.deviceId,
      enrollmentSessionId: row.enrollmentSessionId,
      contractId: row.contractId,
      customerId: row.customerId,
      reason: row.reason,
      shopCode: row.shopCode,
      createdAt: row.createdAt,
      alreadyActivated,
      device: row.device
        ? { id: row.device.id, status: row.device.status }
        : undefined,
    };
  }

  private requireTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }
    return ctx.tenantId;
  }

  private requireElevated(ctx: TenantContext) {
    if (
      ctx.role !== PlatformRole.MERCHANT_OWNER &&
      ctx.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('DEVICE_UNBIND_DENIED');
    }
  }

  private requireIdempotencyKey(idempotencyKey: string): string {
    const trimmed = idempotencyKey?.trim();
    if (!trimmed) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    return trimmed;
  }

  private requireReason(reason: string | undefined): string {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 3) {
      throw new BadRequestException('reason is required.');
    }
    return trimmed;
  }
}
