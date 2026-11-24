import {
  ConflictException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeviceLifecycleStatus, EnrollmentSessionStatus } from '@prisma/client';
import { DeviceCheckInService } from './device-check-in.service';
import { hashEnrollmentToken } from './enrollment-token';

describe('DeviceCheckInService', () => {
  const prisma = {
    deviceEnrollmentSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    device: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deviceAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new DeviceCheckInService(prisma as never);
  const rawToken = 'enc_lab_token';
  const session = {
    id: 'sess-1',
    tenantId: 'tenant-a',
    contractId: 'c1',
    imeiUnitId: 'imei-1',
    platform: 'ANDROID',
    status: EnrollmentSessionStatus.QR_GENERATED,
    tokenHash: hashEnrollmentToken(rawToken),
    expiresAt: new Date(Date.now() + 60_000),
    deviceId: null,
    createdByUserId: 'user-1',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    prisma.deviceEnrollmentSession.updateMany.mockResolvedValue({ count: 0 });
  });

  it('rejects a missing enrollment token', async () => {
    await expect(
      service.checkIn('', { deviceOwner: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown enrollment token', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(null);
    await expect(
      service.checkIn(rawToken, { deviceOwner: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired session', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.checkIn(rawToken, { deviceOwner: true }),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('rejects a cancelled session', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      status: EnrollmentSessionStatus.CANCELLED,
    });
    await expect(
      service.checkIn(rawToken, { deviceOwner: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a session id that does not match the token', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    await expect(
      service.checkIn(rawToken, {
        deviceOwner: true,
        sessionId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records NOT_DEVICE_OWNER without creating a device', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.deviceEnrollmentSession.update.mockResolvedValue({
      ...session,
      lastErrorCode: 'NOT_DEVICE_OWNER',
    });
    const result = await service.checkIn(rawToken, {
      deviceOwner: false,
      errorCode: 'NOT_DEVICE_OWNER',
    });
    expect(result.deviceId).toBeNull();
    expect(result.lastErrorCode).toBe('NOT_DEVICE_OWNER');
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it('creates a device from a QR_GENERATED session when Device Owner is confirmed', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.device.findFirst.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({
      id: 'dev-1',
      status: DeviceLifecycleStatus.ENROLLED,
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.checkIn(rawToken, {
      deviceOwner: true,
      sessionId: 'sess-1',
    });

    expect(result.deviceId).toBe('dev-1');
    expect(result.deviceOwner).toBe(true);
    expect(result.agentToken).toMatch(/^dat_/);
    expect(prisma.device.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentTokenHash: expect.any(String),
        }),
      }),
    );
    expect(prisma.deviceEnrollmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentSessionStatus.ENROLLING,
        }),
      }),
    );
  });

  it('is idempotent on replay: returns the existing device without creating or auditing again', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      status: EnrollmentSessionStatus.ENROLLING,
      deviceId: 'dev-1',
    });

    const result = await service.checkIn(rawToken, {
      deviceOwner: true,
      sessionId: 'sess-1',
    });

    expect(result).toEqual({
      sessionId: 'sess-1',
      deviceId: 'dev-1',
      deviceOwner: true,
      lastErrorCode: null,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.device.create).not.toHaveBeenCalled();
    expect(prisma.deviceAuditEvent.create).not.toHaveBeenCalled();
    expect(prisma.deviceEnrollmentSession.update).not.toHaveBeenCalled();
  });

  it('rejects check-in for a session that is no longer checkable and has no device', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      status: EnrollmentSessionStatus.COMPLETED,
      deviceId: null,
    });

    await expect(
      service.checkIn(rawToken, { deviceOwner: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it('scopes the device lookup to the session tenant and reuses a matching device', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.device.update.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.checkIn(rawToken, { deviceOwner: true });

    expect(result.deviceId).toBe('dev-existing');
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: 'tenant-a' }),
    });
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it('writes a CHECK_IN audit event tied to the session tenant and device', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.device.findFirst.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({
      id: 'dev-2',
      status: DeviceLifecycleStatus.ENROLLED,
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    await service.checkIn(rawToken, {
      deviceOwner: true,
      serial: ' SN-123 ',
    });

    expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        deviceId: 'dev-2',
        action: 'CHECK_IN',
        reason: 'dpc-check-in serial=SN-123',
      }),
    });
  });

  it('clears device_id on other sessions before attaching an existing device', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.device.update.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    await service.checkIn(rawToken, { deviceOwner: true });

    expect(prisma.deviceEnrollmentSession.updateMany).toHaveBeenCalledWith({
      where: {
        deviceId: 'dev-existing',
        NOT: { id: 'sess-1' },
      },
      data: { deviceId: null },
    });
    const releaseOrder =
      prisma.deviceEnrollmentSession.updateMany.mock.invocationCallOrder[0];
    const attachOrder =
      prisma.deviceEnrollmentSession.update.mock.invocationCallOrder[0];
    expect(releaseOrder).toBeLessThan(attachOrder);
  });

  it('rotates agentTokenHash when reusing an existing device row', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.device.update.mockResolvedValue({
      id: 'dev-existing',
      tenantId: 'tenant-a',
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.checkIn(rawToken, { deviceOwner: true });
    expect(result.agentToken).toMatch(/^dat_/);
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentTokenHash: expect.any(String),
        }),
      }),
    );
  });
});
