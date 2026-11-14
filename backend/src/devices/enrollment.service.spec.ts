import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, PlatformRole } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';

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
