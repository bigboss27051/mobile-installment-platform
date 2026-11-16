import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ContractStatus, PlatformRole } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { hashEnrollmentToken } from './enrollment-token';

const DPC_ENV = {
  DPC_COMPONENT_NAME: 'com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver',
  DPC_DOWNLOAD_URL: 'https://downloads.example.test/dpc.apk',
  DPC_PACKAGE_CHECKSUM: createHash('sha256').update('phase2-dpc').digest('base64url'),
  DPC_ENROLLMENT_ENDPOINT: 'https://api.example.test/api/v1/devices/enroll/check-in',
};

function applyDpcEnv(): void {
  for (const [key, value] of Object.entries(DPC_ENV)) {
    process.env[key] = value;
  }
}

function clearDpcEnv(): void {
  for (const key of Object.keys(DPC_ENV)) {
    delete process.env[key];
  }
}

describe('EnrollmentService', () => {
  const prisma = {
    contract: { findFirst: jest.fn() },
    deviceEnrollmentSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new EnrollmentService(prisma as never);
  const tenantCtx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects create without tenant', async () => {
    await expect(
      service.create(
        { tenantId: null, userId: 'x', role: PlatformRole.SUPER_ADMIN },
        {
          contractId: '11111111-1111-4111-8111-111111111111',
          platform: 'ANDROID',
        },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects create when contract is not ACTIVE', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: ContractStatus.DRAFT,
    });
    await expect(
      service.create(
        tenantCtx,
        { contractId: 'c1', platform: 'ANDROID' },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.deviceEnrollmentSession.create).not.toHaveBeenCalled();
  });

  it('returns the same session for the same idempotency key', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: ContractStatus.ACTIVE,
    });
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      status: 'WAITING_FOR_DEVICE',
      platform: 'ANDROID',
      idempotencyKey: 'idem-1',
      contractId: 'c1',
      tokenHash: 'abc',
    });
    const result = await service.create(
      tenantCtx,
      { contractId: 'c1', platform: 'ANDROID' },
      'idem-1',
    );
    expect(result.id).toBe('s1');
    expect(result.enrollmentToken).toBeUndefined();
    expect(prisma.deviceEnrollmentSession.create).not.toHaveBeenCalled();
  });

  it('creates a session with hashed token and does not persist raw token', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: ContractStatus.ACTIVE,
    });
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(null);
    prisma.deviceEnrollmentSession.create.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => ({
      id: 's-new',
      status: args.data.status,
      platform: args.data.platform,
      expiresAt: args.data.expiresAt,
      tokenHash: args.data.tokenHash,
    }));

    const result = await service.create(
      tenantCtx,
      { contractId: 'c1', platform: 'ANDROID', ttlSeconds: 3600 },
      'idem-new',
    );

    expect(result.enrollmentToken?.startsWith('enc_')).toBe(true);
    const created = prisma.deviceEnrollmentSession.create.mock.calls[0][0]
      .data as Record<string, unknown>;
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.tokenHash).not.toBe(result.enrollmentToken);
    expect(created).not.toHaveProperty('token');
    expect(created.status).toBe('WAITING_FOR_DEVICE');
  });

  it('sets QR_GENERATED when Android QR is materialized', async () => {
    prisma.deviceEnrollmentSession.update.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => ({
      id: 's1',
      status: args.data.status,
      qrFingerprint: args.data.qrFingerprint,
    }));

    applyDpcEnv();
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
      status: 'WAITING_FOR_DEVICE',
      expiresAt,
      tokenHash: 'aa'.repeat(32),
    });

    const qr = await service.materializeQr(tenantCtx, 's1');

    const bundle = qr.payload[
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE'
    ] as { enrollmentToken: string };
    const update = prisma.deviceEnrollmentSession.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(update.data.status).toBe('QR_GENERATED');
    expect(update.data.tokenHash).toBe(hashEnrollmentToken(bundle.enrollmentToken));
    expect(update.data.tokenHash).not.toBe('aa'.repeat(32));
    expect(update.data.expiresAt).toBeUndefined();
    expect(qr.expiresAt).toEqual(expiresAt);
    expect(
      qr.payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME'],
    ).toBe(DPC_ENV.DPC_COMPONENT_NAME);
    clearDpcEnv();
  });

  it('refuses QR when DPC settings are missing and leaves the session unchanged', async () => {
    clearDpcEnv();
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
      status: 'WAITING_FOR_DEVICE',
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'aa'.repeat(32),
    });
    await expect(service.materializeQr(tenantCtx, 's1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.deviceEnrollmentSession.update).not.toHaveBeenCalled();
  });

  it('refuses QR outside waiting and generated states', async () => {
    applyDpcEnv();
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
      status: 'NOT_STARTED',
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'aa'.repeat(32),
    });
    await expect(service.materializeQr(tenantCtx, 's1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.deviceEnrollmentSession.update).not.toHaveBeenCalled();
    clearDpcEnv();
  });

  it('refuses iOS QR materialization', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'IOS',
      status: 'WAITING_FOR_DEVICE',
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'aa'.repeat(32),
    });
    await expect(service.materializeQr(tenantCtx, 's1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks an open session expired when TTL has passed', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
      status: 'WAITING_FOR_DEVICE',
      expiresAt: new Date(Date.now() - 1000),
      contractId: 'c1',
      qrFingerprint: null,
      lastErrorCode: null,
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 1000),
      contractId: 'c1',
      qrFingerprint: null,
      lastErrorCode: 'ENROLLMENT_EXPIRED',
    });
    const result = await service.getById(tenantCtx, 's1');
    expect(result.status).toBe('EXPIRED');
    expect(prisma.deviceEnrollmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'EXPIRED',
          lastErrorCode: 'ENROLLMENT_EXPIRED',
        }),
      }),
    );
  });

  it('returns 404 for another tenant session', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(null);
    await expect(service.getById(tenantCtx, 's-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
