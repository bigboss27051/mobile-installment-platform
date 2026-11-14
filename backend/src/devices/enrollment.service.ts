import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ContractStatus,
  DevicePlatform,
  EnrollmentSessionStatus,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { buildAndroidEnrollmentQrPayload } from './enrollment-qr';
import { issueEnrollmentToken } from './enrollment-token';

const OPEN_STATUSES: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.PROVISIONING,
  EnrollmentSessionStatus.ENROLLING,
  EnrollmentSessionStatus.VERIFYING,
  EnrollmentSessionStatus.ACTIVATING,
  EnrollmentSessionStatus.RECOVERY_REQUIRED,
];

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ctx: TenantContext,
    dto: {
      contractId: string;
      platform: DevicePlatform;
      imeiUnitId?: string;
      ttlSeconds?: number;
    },
    idempotencyKey: string,
  ): Promise<{
    id: string;
    status: EnrollmentSessionStatus;
    platform: DevicePlatform;
    expiresAt: Date;
    contractId: string;
    qrFingerprint: string | null;
    lastErrorCode: string | null;
    enrollmentToken?: string;
  }> {
    const tenantId = this.requireTenant(ctx);
    const key = this.requireIdempotencyKey(idempotencyKey);

    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, tenantId },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new ConflictException('CONTRACT_NOT_ACTIVE');
    }

    const imeiUnitId = dto.imeiUnitId ?? contract.imeiUnitId;
    if (imeiUnitId !== contract.imeiUnitId) {
      throw new ConflictException('IMEI_DOES_NOT_MATCH_CONTRACT');
    }

    const existingByKey = await this.prisma.deviceEnrollmentSession.findFirst({
      where: { tenantId, idempotencyKey: key },
    });
    if (existingByKey) {
      if (
        existingByKey.contractId !== contract.id ||
        existingByKey.platform !== dto.platform
      ) {
        throw new ConflictException(
          'Idempotency-Key has already been used with a different enrollment payload.',
        );
      }
      return this.toPublic(existingByKey);
    }

    const open = await this.prisma.deviceEnrollmentSession.findFirst({
      where: {
        tenantId,
        contractId: contract.id,
        platform: dto.platform,
        status: { in: OPEN_STATUSES },
      },
    });
    if (open) {
      throw new ConflictException('SESSION_OPEN');
    }

    const token = issueEnrollmentToken();
    const ttlSeconds = dto.ttlSeconds ?? 3600;
    const created = await this.prisma.deviceEnrollmentSession.create({
      data: {
        tenantId,
        contractId: contract.id,
        imeiUnitId,
        platform: dto.platform,
        status: EnrollmentSessionStatus.WAITING_FOR_DEVICE,
        tokenHash: token.hash,
        idempotencyKey: key,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        createdByUserId: ctx.userId,
      },
    });

    return { ...this.toPublic(created), enrollmentToken: token.raw };
  }

  async getById(ctx: TenantContext, id: string) {
    const session = await this.findOwned(ctx, id);
    return this.toPublic(session);
  }

  async cancel(ctx: TenantContext, id: string) {
    const session = await this.findOwned(ctx, id);
    if (session.status === EnrollmentSessionStatus.CANCELLED) {
      return this.toPublic(session);
    }
    if (!OPEN_STATUSES.includes(session.status)) {
      throw new ConflictException('SESSION_NOT_CANCELLABLE');
    }
    const updated = await this.prisma.deviceEnrollmentSession.update({
      where: { id: session.id },
      data: { status: EnrollmentSessionStatus.CANCELLED },
    });
    return this.toPublic(updated);
  }

  async materializeQr(ctx: TenantContext, id: string) {
    const session = await this.findOwned(ctx, id);
    if (session.platform !== DevicePlatform.ANDROID) {
      throw new BadRequestException('QR_NOT_APPLICABLE');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('ENROLLMENT_EXPIRED');
    }
    const payload = buildAndroidEnrollmentQrPayload({
      enrollmentToken: `session:${session.id}`,
      sessionId: session.id,
    });
    const serialized = JSON.stringify(payload);
    if (/WIFI_PASSWORD/i.test(serialized)) {
      throw new BadRequestException('PLAYLOAD_SECRET_FORBIDDEN');
    }
    const payloadFingerprint = createHash('sha256')
      .update(serialized)
      .digest('hex');
    await this.prisma.deviceEnrollmentSession.update({
      where: { id: session.id },
      data: { qrFingerprint: payloadFingerprint },
    });
    return {
      format: 'ANDROID_ENTERPRISE_QR' as const,
      payload,
      payloadFingerprint,
      expiresAt: session.expiresAt,
    };
  }

  private async findOwned(ctx: TenantContext, id: string) {
    const tenantId = this.requireTenant(ctx);
    const session = await this.prisma.deviceEnrollmentSession.findFirst({
      where: { id, tenantId },
    });
    if (!session) {
      throw new NotFoundException('Enrollment session not found.');
    }
    return session;
  }

  private toPublic(session: {
    id: string;
    status: EnrollmentSessionStatus;
    platform: DevicePlatform;
    expiresAt: Date;
    contractId: string;
    qrFingerprint: string | null;
    lastErrorCode: string | null;
  }) {
    return {
      id: session.id,
      status: session.status,
      platform: session.platform,
      expiresAt: session.expiresAt,
      contractId: session.contractId,
      qrFingerprint: session.qrFingerprint,
      lastErrorCode: session.lastErrorCode,
    };
  }

  private requireTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }
    return ctx.tenantId;
  }

  private requireIdempotencyKey(idempotencyKey: string): string {
    const trimmed = idempotencyKey?.trim();
    if (!trimmed) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    return trimmed;
  }
}
