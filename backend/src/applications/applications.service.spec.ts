import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ApplicationStatus, InterestMethod, PlatformRole, Prisma } from '@prisma/client';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  const prisma = {
    customer: { findFirst: jest.fn() },
    installmentPlan: { findFirst: jest.fn() },
    imeiUnit: { findFirst: jest.fn() },
    application: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const service = new ApplicationsService(prisma as never);

  const tenantCtx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  const noTenantCtx = {
    tenantId: null,
    userId: 'admin-1',
    role: PlatformRole.SUPER_ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create without tenant context', async () => {
    await expect(
      service.create(noTenantCtx, {
        customerId: '11111111-1111-4111-8111-111111111111',
        imeiUnitId: '22222222-2222-4222-8222-222222222222',
        planId: '33333333-3333-4333-8333-333333333333',
        principal: '12000.00',
        downPayment: '2000.00',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates DRAFT application with plan snapshot and money strings', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.installmentPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
    });
    prisma.imeiUnit.findFirst.mockResolvedValue({ id: 'imei-1' });
    prisma.application.findFirst.mockResolvedValue(null);
    prisma.application.create.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.DRAFT,
      submittedAt: null,
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      scorecard: null,
    });

    await expect(
      service.create(tenantCtx, {
        customerId: '11111111-1111-4111-8111-111111111111',
        imeiUnitId: '22222222-2222-4222-8222-222222222222',
        planId: '33333333-3333-4333-8333-333333333333',
        principal: '12000.00',
        downPayment: '2000.00',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'app-1',
        status: ApplicationStatus.DRAFT,
        principal: '12000.00',
        downPayment: '2000.00',
        annualRate: '12.00',
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        scorecard: null,
      }),
    );

    expect(prisma.application.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.application.create.mock.calls[0][0];
    expect(createArg.include).toEqual({ scorecard: true });
    expect(createArg.data).toMatchObject({
      tenantId: 'tenant-a',
      customerId: '11111111-1111-4111-8111-111111111111',
      imeiUnitId: '22222222-2222-4222-8222-222222222222',
      planId: 'plan-1',
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      status: ApplicationStatus.DRAFT,
    });
    expect(String(createArg.data.principal)).toBe('12000');
    expect(String(createArg.data.downPayment)).toBe('2000');
    expect(String(createArg.data.annualRate)).toBe('12');
  });

  it('rejects create when another open application uses the IMEI', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.installmentPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
    });
    prisma.imeiUnit.findFirst.mockResolvedValue({ id: 'imei-1' });
    prisma.application.findFirst.mockResolvedValue({ id: 'open-app-1' });

    await expect(
      service.create(tenantCtx, {
        customerId: '11111111-1111-4111-8111-111111111111',
        imeiUnitId: '22222222-2222-4222-8222-222222222222',
        planId: '33333333-3333-4333-8333-333333333333',
        principal: '12000.00',
        downPayment: '2000.00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
