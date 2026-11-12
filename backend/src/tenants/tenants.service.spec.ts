import { ForbiddenException } from '@nestjs/common';
import { PlatformRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TenantsService } from './tenants.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('TenantsService isolation', () => {
  const prisma = {
    $transaction: jest.fn(),
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const service = new TenantsService(prisma as never);

  beforeEach(() => {
    prisma.$transaction.mockReset();
    prisma.tenant.findUnique.mockReset();
  });

  it('creates tenant, branch, and owner in one transaction', async () => {
    const tx = {
      tenant: {
        create: jest.fn().mockResolvedValue({ id: 'tenant-a' }),
      },
      branch: {
        create: jest.fn().mockResolvedValue({ id: 'branch-a' }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'user-a' }),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const hashMock = bcrypt.hash as unknown as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    await expect(
      service.createTenantWithOwner({
        tenantName: 'Tenant A',
        branchCode: 'HQ',
        branchName: 'Headquarter',
        ownerEmail: 'OWNER@EXAMPLE.COM',
        ownerPassword: 'super-secret',
        ownerFullName: 'Owner Name',
      }),
    ).resolves.toEqual({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      userId: 'user-a',
    });

    expect(hashMock).toHaveBeenCalledWith('super-secret', 12);
    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: {
        name: 'Tenant A',
        status: TenantStatus.ACTIVE,
      },
    });
    expect(tx.branch.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        code: 'HQ',
        name: 'Headquarter',
      },
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        email: 'owner@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Owner Name',
        role: PlatformRole.MERCHANT_OWNER,
      },
    });
  });

  it('denies reading another tenant for merchant owner', async () => {
    await expect(
      service.getTenantByIdForContext('tenant-b', {
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('allows reading own tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-a',
      name: 'Tenant A',
    });

    await expect(
      service.getTenantByIdForContext('tenant-a', {
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).resolves.toEqual({
      id: 'tenant-a',
      name: 'Tenant A',
    });
  });

  it('allows super admin to read another tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-b',
      name: 'Tenant B',
    });

    await expect(
      service.getTenantByIdForContext('tenant-b', {
        tenantId: null,
        userId: 'admin-1',
        role: PlatformRole.SUPER_ADMIN,
      }),
    ).resolves.toEqual({
      id: 'tenant-b',
      name: 'Tenant B',
    });
  });
});
