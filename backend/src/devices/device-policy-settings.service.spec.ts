import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { DevicePolicySettingsService } from './device-policy-settings.service';

describe('DevicePolicySettingsService', () => {
  const tenantId = 't1';
  const ownerCtx = {
    tenantId,
    userId: 'u-owner',
    role: PlatformRole.MERCHANT_OWNER,
  };
  const staffCtx = {
    tenantId,
    userId: 'u-staff',
    role: PlatformRole.MERCHANT_STAFF,
  };

  function makePrisma() {
    return {
      tenantDevicePolicySettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      deviceAuditEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          tenantDevicePolicySettings: {
            upsert: jest.fn().mockResolvedValue({
              tenantId,
              reminderAfterDays: 2,
              restrictAfterDays: 4,
              lockAfterDays: 9,
              autoEvaluateCronEnabled: false,
              requireLockApproval: true,
            }),
          },
          deviceAuditEvent: { create: jest.fn() },
        }),
      ),
    };
  }

  it('getOrCreate returns defaults when missing', async () => {
    const prisma = makePrisma();
    (prisma.tenantDevicePolicySettings.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.tenantDevicePolicySettings.create as jest.Mock).mockResolvedValue({
      tenantId,
      reminderAfterDays: 1,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    const svc = new DevicePolicySettingsService(prisma as never);
    const row = await svc.getOrCreate(ownerCtx);
    expect(row.reminderAfterDays).toBe(1);
    expect(prisma.tenantDevicePolicySettings.create).toHaveBeenCalled();
  });

  it('staff cannot get or update settings', async () => {
    const svc = new DevicePolicySettingsService(makePrisma() as never);
    await expect(svc.getOrCreate(staffCtx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      svc.update(staffCtx, {
        reminderAfterDays: 1,
        restrictAfterDays: 3,
        lockAfterDays: 7,
        autoEvaluateCronEnabled: true,
        requireLockApproval: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update rejects invalid day order', async () => {
    const svc = new DevicePolicySettingsService(makePrisma() as never);
    await expect(
      svc.update(ownerCtx, {
        reminderAfterDays: 5,
        restrictAfterDays: 3,
        lockAfterDays: 7,
        autoEvaluateCronEnabled: true,
        requireLockApproval: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
