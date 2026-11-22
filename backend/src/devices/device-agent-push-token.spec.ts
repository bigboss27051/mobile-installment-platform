import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DeviceCommandsService } from './device-commands.service';
import { hashDeviceAgentToken } from './device-agent-token';

describe('DeviceCommandsService — registerPushToken', () => {
  const prisma = {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    devicePolicyState: { findUnique: jest.fn() },
    deviceCommand: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    deviceAuditEvent: { create: jest.fn() },
    deviceLocationSample: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const locations = {
    persistSample: jest.fn(),
    clearForDevice: jest.fn(),
  };

  const service = new DeviceCommandsService(
    prisma as never,
    locations as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
  });

  it('stores fcm token for device resolved by agent token', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    const updatedAt = new Date('2026-11-22T14:00:00.000Z');
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      fcmToken: 'fcm-abc',
      fcmTokenUpdatedAt: updatedAt,
    });

    const result = await service.registerPushTokenForAgent(raw, {
      token: 'fcm-abc',
    });

    expect(result.deviceId).toBe('dev-1');
    expect(result.fcmTokenUpdatedAt).toBe(updatedAt.toISOString());
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { agentTokenHash: hashDeviceAgentToken(raw) },
    });
    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: 'dev-1' },
      data: {
        fcmToken: 'fcm-abc',
        fcmTokenUpdatedAt: expect.any(Date),
      },
    });
  });

  it('rejects empty token', async () => {
    const raw = 'dat_lab_token';
    await expect(
      service.registerPushTokenForAgent(raw, { token: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.device.findFirst).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only agent token before lookup', async () => {
    await expect(
      service.registerPushTokenForAgent('  ', { token: 'fcm-abc' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.device.findFirst).not.toHaveBeenCalled();
  });
});