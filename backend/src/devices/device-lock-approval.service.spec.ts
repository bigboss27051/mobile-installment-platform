import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  DeviceLockApprovalStatus,
  DeviceCommandType,
  PlatformRole,
} from '@prisma/client';
import { DeviceLockApprovalService } from './device-lock-approval.service';

describe('DeviceLockApprovalService', () => {
  const tenantId = 't1';
  const staffCtx = {
    tenantId,
    userId: 'u1',
    role: PlatformRole.MERCHANT_STAFF,
  };

  it('lists pending with masked IMEI', async () => {
    const prisma = {
      deviceLockApproval: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            deviceId: 'd1',
            contractId: 'c1',
            status: DeviceLockApprovalStatus.PENDING,
            overdueDays: 9,
            reason: 'overdue',
            requestedAt: new Date('2026-11-22T00:00:00Z'),
            resolvedAt: null,
            device: { imeiUnit: { imei: '123456789012345' } },
          },
        ]),
      },
    };
    const svc = new DeviceLockApprovalService(
      prisma as never,
      {} as never,
    );
    const rows = await svc.list(staffCtx, 'PENDING');
    expect(rows[0].maskedImei).toBe('••••2345');
    expect(rows[0].overdueDays).toBe(9);
  });

  it('approve enqueues START_LOCK_TASK', async () => {
    const pending = {
      id: 'a1',
      deviceId: 'd1',
      tenantId,
      status: DeviceLockApprovalStatus.PENDING,
      reason: 'ladder',
    };
    const prisma = {
      deviceLockApproval: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(pending),
        update: jest.fn().mockResolvedValue({
          ...pending,
          status: DeviceLockApprovalStatus.APPROVED,
        }),
      },
      deviceAuditEvent: { create: jest.fn() },
    };
    const commands = {
      enqueue: jest.fn().mockResolvedValue({ id: 'cmd1' }),
    };
    const svc = new DeviceLockApprovalService(
      prisma as never,
      commands as never,
    );
    const result = await svc.approve(staffCtx, 'a1', 'ok lock', 'idem-1');
    expect(commands.enqueue).toHaveBeenCalledWith(
      staffCtx,
      'd1',
      expect.objectContaining({
        type: DeviceCommandType.START_LOCK_TASK,
      }),
    );
    expect(result.commandId).toBe('cmd1');
    expect(result.replay).toBe(false);
  });

  it('reject does not enqueue', async () => {
    const pending = {
      id: 'a1',
      deviceId: 'd1',
      tenantId,
      status: DeviceLockApprovalStatus.PENDING,
      reason: 'ladder',
    };
    const prisma = {
      deviceLockApproval: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(pending),
        update: jest.fn().mockResolvedValue({
          ...pending,
          status: DeviceLockApprovalStatus.REJECTED,
        }),
      },
      deviceAuditEvent: { create: jest.fn() },
    };
    const commands = { enqueue: jest.fn() };
    const svc = new DeviceLockApprovalService(
      prisma as never,
      commands as never,
    );
    await svc.reject(staffCtx, 'a1', 'no', 'idem-2');
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('approve wrong tenant/missing throws NotFound', async () => {
    const prisma = {
      deviceLockApproval: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new DeviceLockApprovalService(
      prisma as never,
      { enqueue: jest.fn() } as never,
    );
    await expect(
      svc.approve(staffCtx, 'missing', 'x', 'idem'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancelPendingForDevice updates PENDING rows', async () => {
    const prisma = {
      deviceLockApproval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const svc = new DeviceLockApprovalService(
      prisma as never,
      {} as never,
    );
    await expect(
      svc.cancelPendingForDevice(tenantId, 'd1', 'cancel:unbind'),
    ).resolves.toBe(1);
  });

  it('denies without devices.command', async () => {
    const svc = new DeviceLockApprovalService({} as never, {} as never);
    await expect(
      svc.list({ tenantId, userId: 'u', role: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
