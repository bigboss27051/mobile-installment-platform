import { ForbiddenException } from '@nestjs/common';
import { InterestMethod, PlatformRole, Prisma } from '@prisma/client';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  const prisma = {
    installmentPlan: {
      findMany: jest.fn(),
    },
  };

  const service = new PlansService(prisma as never);

  beforeEach(() => {
    prisma.installmentPlan.findMany.mockReset();
  });

  it('rejects listing plans without tenant context', async () => {
    await expect(
      service.list({
        tenantId: null,
        userId: 'admin-1',
        role: PlatformRole.SUPER_ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only active plans scoped by tenant ordered by code', async () => {
    prisma.installmentPlan.findMany.mockResolvedValue([
      {
        id: 'plan-1',
        tenantId: 'tenant-a',
        code: 'FLAT-6',
        name: 'Flat 6 months',
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        termMonths: 6,
        active: true,
      },
    ]);

    await expect(
      service.list({
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).resolves.toMatchObject([{ id: 'plan-1', code: 'FLAT-6', active: true }]);

    expect(prisma.installmentPlan.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        active: true,
      },
      orderBy: { code: 'asc' },
    });
  });
});
