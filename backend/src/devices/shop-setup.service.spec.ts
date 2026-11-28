import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { ShopSetupService } from './shop-setup.service';

const readyBody = {
  dpcAttested: true,
  googleAccountReady: true,
  wipeNeedsOnDeviceUnlock: true,
  noRemoteFrpBypass: true,
};

describe('ShopSetupService', () => {
  const prisma = {
    tenantShopSetup: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const service = new ShopSetupService(prisma as never);
  const owner = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns null when the tenant has no shop setup row', async () => {
    prisma.tenantShopSetup.findUnique.mockResolvedValue(null);
    await expect(service.get(owner)).resolves.toBeNull();
    expect(prisma.tenantShopSetup.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
    });
  });

  it('omits completedByUserId from the public payload', async () => {
    prisma.tenantShopSetup.findUnique.mockResolvedValue({
      tenantId: 'tenant-a',
      ...readyBody,
      completedAt: new Date('2026-11-28T10:00:00.000Z'),
      completedByUserId: 'user-1',
    });
    const row = await service.get(owner);
    expect(row).toMatchObject({ ...readyBody, ready: true });
    expect(row).not.toHaveProperty('completedByUserId');
    expect(row).not.toHaveProperty('tenantId');
  });

  it('marks the shop ready only when every checklist field is true', async () => {
    prisma.tenantShopSetup.upsert.mockImplementation(async (args: {
      create: Record<string, unknown>;
    }) => args.create);
    const saved = await service.put(owner, readyBody);
    expect(saved.ready).toBe(true);
    expect(saved.completedAt).toBeInstanceOf(Date);
    const write = prisma.tenantShopSetup.upsert.mock.calls[0][0] as {
      where: { tenantId: string };
      create: { completedByUserId: string };
    };
    expect(write.where.tenantId).toBe('tenant-a');
    expect(write.create.completedByUserId).toBe('user-1');
    expect(saved).not.toHaveProperty('completedByUserId');
  });

  it('clears completion when a later write sets any field false', async () => {
    prisma.tenantShopSetup.upsert.mockImplementation(async (args: {
      create: Record<string, unknown>;
    }) => args.create);
    const saved = await service.put(owner, {
      ...readyBody,
      googleAccountReady: false,
    });
    expect(saved.ready).toBe(false);
    expect(saved.completedAt).toBeNull();
    const write = prisma.tenantShopSetup.upsert.mock.calls[0][0] as {
      create: { completedByUserId: string | null };
    };
    expect(write.create.completedByUserId).toBeNull();
  });

  it('rejects a body that is not four booleans', async () => {
    await expect(
      service.put(owner, { ...readyBody, dpcAttested: 'yes' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tenantShopSetup.upsert).not.toHaveBeenCalled();
  });

  it('rejects a caller without devices.enroll', async () => {
    await expect(
      service.get({ tenantId: 'tenant-a', userId: 'user-1', role: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.put(
        { tenantId: 'tenant-a', userId: 'user-2', role: null },
        readyBody,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tenantShopSetup.findUnique).not.toHaveBeenCalled();
    expect(prisma.tenantShopSetup.upsert).not.toHaveBeenCalled();
  });

  it('does not read another tenant row', async () => {
    prisma.tenantShopSetup.findUnique.mockResolvedValue(null);
    await service.get({
      tenantId: 'tenant-b',
      userId: 'user-9',
      role: PlatformRole.MERCHANT_OWNER,
    });
    expect(prisma.tenantShopSetup.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b' },
    });
  });
});
