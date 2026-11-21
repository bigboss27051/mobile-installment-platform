import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceCommandStatus,
  DeviceLifecycleStatus,
  DeviceRecoveryType,
  EnrollmentSessionStatus,
  PlatformEnforcementState,
} from '@prisma/client';
import { DeviceRecoveryService } from './device-recovery.service';

describe('DeviceRecoveryService', () => {
  const prisma = {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    deviceEnrollmentSession: {
      updateMany: jest.fn(),
    },
    deviceCommand: {
      updateMany: jest.fn(),
    },
    devicePolicyState: {
      upsert: jest.fn(),
    },
    deviceRecoveryRequest: {
      create: jest.fn(),
    },
    deviceAuditEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const locations = {
    clearForDevice: jest.fn(),
  };

  const service = new DeviceRecoveryService(
    prisma as never,
    locations as never,
  );
  const user = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    role: 'MERCHANT_OWNER',
  } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
  });

  it('rejects REENROLL without a reason', async () => {
    await expect(
      service.request(user, 'dev-1', {
        type: DeviceRecoveryType.REENROLL,
        reason: '  ',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects REENROLL for another tenant device', async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    await expect(
      service.request(user, 'dev-x', {
        type: DeviceRecoveryType.REENROLL,
        reason: 'after wipe FRP cleared',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('REENROLL cancels open sessions, clears agent token, expires lock commands', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ENROLLED,
    });
    prisma.deviceEnrollmentSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.deviceCommand.updateMany.mockResolvedValue({ count: 1 });
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      status: DeviceLifecycleStatus.PENDING_ENROLL,
    });
    prisma.devicePolicyState.upsert.mockResolvedValue({});
    prisma.deviceRecoveryRequest.create.mockResolvedValue({
      id: 'rec-1',
      type: DeviceRecoveryType.REENROLL,
      status: 'APPROVED',
      reason: 'after wipe FRP cleared',
      deviceId: 'dev-1',
    });
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.request(user, 'dev-1', {
      type: DeviceRecoveryType.REENROLL,
      reason: 'after wipe FRP cleared',
    });

    expect(result.id).toBe('rec-1');
    expect(prisma.deviceEnrollmentSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentSessionStatus.CANCELLED,
          deviceId: null,
        }),
      }),
    );
    expect(prisma.deviceEnrollmentSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deviceId: 'dev-1' }),
        data: expect.objectContaining({ deviceId: null }),
      }),
    );
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DeviceLifecycleStatus.PENDING_ENROLL,
          agentTokenHash: null,
        }),
      }),
    );
    expect(prisma.deviceCommand.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DeviceCommandStatus.EXPIRED,
        }),
      }),
    );
    expect(prisma.devicePolicyState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          desiredPresentation: 'NONE',
          platformState: PlatformEnforcementState.NONE,
        }),
      }),
    );
    expect(locations.clearForDevice).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
    );
  });

  it('rejects when tenant is missing', async () => {
    await expect(
      service.request(
        { userId: 'u', tenantId: null, role: null } as never,
        'dev-1',
        { type: DeviceRecoveryType.REENROLL, reason: 'lab' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
