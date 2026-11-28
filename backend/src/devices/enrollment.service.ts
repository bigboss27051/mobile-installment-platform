import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ContractStatus,
  DevicePlatform,
  EnrollmentSessionStatus,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAndroidEnrollmentQrPayload,
  diagnoseDpcQrSettings,
  resolveDpcQrSettings,
} from './enrollment-qr';
import { issueEnrollmentToken } from './enrollment-token';
import { isShopSetupReady } from './shop-setup';

const QR_ISSUABLE_STATUSES: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.QR_GENERATED,
];

/** Blocks a second create for the same contract+platform. RECOVERY_REQUIRED does not block — staff must be able to start a new session after wipe/FRP. */
const OPEN_STATUSES: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.NOT_STARTED,
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.QR_GENERATED,
  EnrollmentSessionStatus.PROVISIONING,
  EnrollmentSessionStatus.ENROLLING,
  EnrollmentSessionStatus.VERIFYING,
  EnrollmentSessionStatus.ACTIVATING,
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

    if (dto.platform === DevicePlatform.ANDROID) {
      await this.assertAndroidShopReady(tenantId);
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

  async findLatestOpen(ctx: TenantContext) {
    const tenantId = this.requireTenant(ctx);
    const session = await this.prisma.deviceEnrollmentSession.findFirst({
      where: { tenantId, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) {
      return null;
    }
    return this.toPublic(await this.expireIfNeeded(session));
  }

  async getById(ctx: TenantContext, id: string) {
    const session = await this.findOwned(ctx, id);
    return this.toPublic(await this.expireIfNeeded(session));
  }

  getDpcConfigStatus() {
    return diagnoseDpcQrSettings(process.env);
  }

  async cancel(ctx: TenantContext, id: string) {
    const session = await this.expireIfNeeded(await this.findOwned(ctx, id));
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
    const session = await this.expireIfNeeded(await this.findOwned(ctx, id));
    if (session.platform !== DevicePlatform.ANDROID) {
      throw new BadRequestException('QR_NOT_APPLICABLE');
    }
    if (session.status === EnrollmentSessionStatus.EXPIRED) {
      throw new ConflictException('ENROLLMENT_EXPIRED');
    }
    if (!QR_ISSUABLE_STATUSES.includes(session.status)) {
      throw new ConflictException('SESSION_NOT_QR_READY');
    }
    await this.assertAndroidShopReady(session.tenantId);
    const settings = resolveDpcQrSettings(process.env);
    if (!settings) {
      throw new ServiceUnavailableException('DPC_QR_NOT_CONFIGURED');
    }
    const token = issueEnrollmentToken();
    const payload = buildAndroidEnrollmentQrPayload({
      enrollmentToken: token.raw,
      sessionId: session.id,
      componentName: settings.componentName,
      downloadUrl: settings.downloadUrl,
      packageChecksum: settings.packageChecksum,
      enrollmentEndpoint: settings.enrollmentEndpoint,
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
      data: {
        tokenHash: token.hash,
        qrFingerprint: payloadFingerprint,
        status: EnrollmentSessionStatus.QR_GENERATED,
      },
    });
    return {
      format: 'ANDROID_ENTERPRISE_QR' as const,
      payload,
      payloadFingerprint,
      expiresAt: session.expiresAt,
    };
  }

  private async expireIfNeeded<
    T extends {
      id: string;
      status: EnrollmentSessionStatus;
      expiresAt: Date;
    },
  >(session: T): Promise<T> {
    if (
      !OPEN_STATUSES.includes(session.status) ||
      session.expiresAt.getTime() > Date.now()
    ) {
      return session;
    }
    const updated = await this.prisma.deviceEnrollmentSession.update({
      where: { id: session.id },
      data: {
        status: EnrollmentSessionStatus.EXPIRED,
        lastErrorCode: 'ENROLLMENT_EXPIRED',
      },
    });
    return { ...session, ...updated };
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

  private async assertAndroidShopReady(tenantId: string): Promise<void> {
    const row = await this.prisma.tenantShopSetup.findUnique({
      where: { tenantId },
    });
    if (!row || !isShopSetupReady(row)) {
      throw new ConflictException('SHOP_SETUP_REQUIRED');
    }
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
