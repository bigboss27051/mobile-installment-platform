import { ForbiddenException } from '@nestjs/common';
import { InterestMethod, PlatformRole, Prisma, TenantStatus } from '@prisma/client';
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
      installmentPlan: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
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
        slug: expect.stringMatching(/^tenant-a-[a-z0-9]{8}$/),
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
    expect(tx.installmentPlan.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: 'tenant-a',
          code: 'FLAT-6',
          name: 'Flat 6 months',
          interestMethod: InterestMethod.FLAT,
          annualRate: new Prisma.Decimal('12.00'),
          termMonths: 6,
          active: true,
        },
        {
          tenantId: 'tenant-a',
          code: 'REDUCING-12',
          name: 'Reducing 12 months',
          interestMethod: InterestMethod.REDUCING,
          annualRate: new Prisma.Decimal('18.00'),
          termMonths: 12,
          active: true,
        },
      ],
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
      slug: 'tenant-a-abcd1234',
      branches: [{ id: 'branch-a', code: 'HQ', name: 'HQ' }],
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
      slug: 'tenant-a-abcd1234',
      branches: [{ id: 'branch-a', code: 'HQ', name: 'HQ' }],
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
