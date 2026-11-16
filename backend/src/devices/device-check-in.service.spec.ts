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
    },
    device: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
    expect(prisma.device.create).toHaveBeenCalled();
    expect(prisma.deviceEnrollmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentSessionStatus.ENROLLING,
        }),
      }),
    );
  });
});
