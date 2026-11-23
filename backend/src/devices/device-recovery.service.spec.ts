import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceBindingStatus,
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
    deviceContractBinding: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    deviceRecoveryRequest: {
      create: jest.fn(),
    },
    deviceAuditEvent: {
      create: jest.fn(),
    },
    deviceLockApproval: {
      updateMany: jest.fn(),
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
    prisma.deviceLockApproval.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.request(user, 'dev-1', {
      type: DeviceRecoveryType.REENROLL,
      reason: 'after wipe FRP cleared',
    });

    expect(result.id).toBe('rec-1');
    expect(prisma.deviceLockApproval.updateMany).toHaveBeenCalled();
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

  function stubDeviceFound() {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
    });
    prisma.deviceEnrollmentSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.deviceCommand.updateMany.mockResolvedValue({ count: 0 });
    prisma.devicePolicyState.upsert.mockResolvedValue({});
    prisma.deviceLockApproval.updateMany.mockResolvedValue({ count: 0 });
    prisma.deviceAuditEvent.create.mockResolvedValue({});
    locations.clearForDevice.mockResolvedValue(undefined);
  }

  it('REPLACE marks active binding REPLACED and device UNENROLLED', async () => {
    stubDeviceFound();
    prisma.deviceContractBinding.findFirst.mockResolvedValue({
      id: 'bind-1',
      status: DeviceBindingStatus.ACTIVE,
    });
    prisma.deviceContractBinding.update.mockResolvedValue({
      id: 'bind-1',
      status: DeviceBindingStatus.REPLACED,
    });
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      status: DeviceLifecycleStatus.UNENROLLED,
    });
    prisma.deviceRecoveryRequest.create.mockResolvedValue({
      id: 'rec-replace',
      type: DeviceRecoveryType.REPLACE,
      status: 'APPROVED',
    });

    await service.request(user, 'dev-1', {
      type: DeviceRecoveryType.REPLACE,
      reason: 'screen cracked swap',
    });

    expect(prisma.deviceContractBinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bind-1' },
        data: expect.objectContaining({
          status: DeviceBindingStatus.REPLACED,
        }),
      }),
    );
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DeviceLifecycleStatus.UNENROLLED,
          agentTokenHash: null,
        }),
      }),
    );
    expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: expect.stringContaining('REPLACE:'),
        }),
      }),
    );
  });

  it.each([
    [DeviceRecoveryType.UNENROLL, 'UNENROLL:'],
    [DeviceRecoveryType.RELEASE, 'RELEASE:'],
    [DeviceRecoveryType.CONTRACT_CLOSE, 'CONTRACT_CLOSE:'],
  ] as const)(
    '%s sets device UNENROLLED and active binding UNBOUND',
    async (type, auditPrefix) => {
      stubDeviceFound();
      prisma.deviceContractBinding.findFirst.mockResolvedValue({
        id: 'bind-1',
        status: DeviceBindingStatus.ACTIVE,
      });
      prisma.deviceContractBinding.update.mockResolvedValue({
        id: 'bind-1',
        status: DeviceBindingStatus.UNBOUND,
      });
      prisma.device.update.mockResolvedValue({
        id: 'dev-1',
        status: DeviceLifecycleStatus.UNENROLLED,
      });
      prisma.deviceRecoveryRequest.create.mockResolvedValue({
        id: `rec-${type}`,
        type,
        status: 'APPROVED',
      });

      await service.request(user, 'dev-1', {
        type,
        reason: 'lab closeout',
      });

      expect(prisma.deviceContractBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bind-1' },
          data: expect.objectContaining({
            status: DeviceBindingStatus.UNBOUND,
          }),
        }),
      );
      expect(prisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeviceLifecycleStatus.UNENROLLED,
            agentTokenHash: null,
          }),
        }),
      );
      expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: expect.stringContaining(auditPrefix),
          }),
        }),
      );
    },
  );

  it('UNENROLL with no active binding still creates APPROVED recovery', async () => {
    stubDeviceFound();
    prisma.deviceContractBinding.findFirst.mockResolvedValue(null);
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      status: DeviceLifecycleStatus.UNENROLLED,
    });
    prisma.deviceRecoveryRequest.create.mockResolvedValue({
      id: 'rec-noop',
      type: DeviceRecoveryType.UNENROLL,
      status: 'APPROVED',
    });

    const result = await service.request(user, 'dev-1', {
      type: DeviceRecoveryType.UNENROLL,
      reason: 'already unbound',
    });

    expect(result.id).toBe('rec-noop');
    expect(prisma.deviceContractBinding.update).not.toHaveBeenCalled();
    expect(prisma.device.update).toHaveBeenCalled();
  });
});
