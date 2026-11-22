import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContractStatus, DevicePlatform, Prisma } from '@prisma/client';
import { PortalService } from './portal.service';

describe('PortalService', () => {
  const prisma = {
    contract: { findMany: jest.fn(), findFirst: jest.fn() },
    paymentScheduleItem: { findMany: jest.fn() },
    paymentIntent: { findMany: jest.fn() },
    tenant: { findFirst: jest.fn() },
    deviceContractBinding: { findFirst: jest.fn() },
    deviceEnrollmentSession: { findFirst: jest.fn() },
  };
  const payments = {
    createIntent: jest.fn(),
    getById: jest.fn(),
  };
  const service = new PortalService(prisma as never, payments as never);

  const customerCtx = {
    tenantId: 'tenant-a',
    userId: '',
    role: null,
    customerId: 'cust-1',
    audience: 'customer' as const,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists only the authenticated customer contracts', async () => {
    prisma.contract.findMany.mockResolvedValue([
      {
        id: 'c1',
        status: ContractStatus.ACTIVE,
        principal: new Prisma.Decimal('12000.00'),
        financedAmount: new Prisma.Decimal('10000.00'),
        currency: 'THB',
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.listContracts(customerCtx);

    expect(prisma.contract.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', customerId: 'cust-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result[0]?.id).toBe('c1');
    expect(result[0]?.principal).toBe('12000.00');
  });

  it('hides another customer contract', async () => {
    prisma.contract.findFirst.mockResolvedValue(null);

    await expect(service.getContract(customerCtx, 'other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns outstandingBalance on contract detail', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      status: ContractStatus.ACTIVE,
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      financedAmount: new Prisma.Decimal('10000.00'),
      termMonths: 10,
      interestMethod: 'FLAT',
      annualRate: new Prisma.Decimal('12.00'),
      currency: 'THB',
    });
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        id: 's1',
        seq: 1,
        dueDate: new Date('2026-10-01T00:00:00.000Z'),
        principalDue: new Prisma.Decimal('900.00'),
        interestDue: new Prisma.Decimal('100.00'),
        feesDue: new Prisma.Decimal('0.00'),
        totalDue: new Prisma.Decimal('1000.00'),
        amountPaid: new Prisma.Decimal('250.00'),
        status: 'PARTIAL',
      },
      {
        id: 's2',
        seq: 2,
        dueDate: new Date('2026-11-01T00:00:00.000Z'),
        principalDue: new Prisma.Decimal('900.00'),
        interestDue: new Prisma.Decimal('100.00'),
        feesDue: new Prisma.Decimal('0.00'),
        totalDue: new Prisma.Decimal('1000.00'),
        amountPaid: new Prisma.Decimal('0.00'),
        status: 'DUE',
      },
    ]);
    prisma.paymentIntent.findMany.mockResolvedValue([]);

    const result = await service.getContract(customerCtx, 'c1');

    expect(result.outstandingBalance).toBe('1750.00');
    expect(result.scheduleItems).toHaveLength(2);
  });

  it('returns lock presentation without claiming MDM Single App Mode', async () => {
    prisma.tenant.findFirst.mockResolvedValue({ name: 'Anaheim Shop' });
    prisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      currency: 'THB',
    });
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        totalDue: new Prisma.Decimal('1000.00'),
        amountPaid: new Prisma.Decimal('0.00'),
        dueDate: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
    prisma.paymentIntent.findMany.mockResolvedValue([]);
    prisma.deviceContractBinding.findFirst.mockResolvedValue({
      deviceId: 'dev-1',
      device: { platform: DevicePlatform.IOS },
    });
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      status: 'COMPLETED',
      platform: DevicePlatform.IOS,
    });

    const result = await service.getLockStatus(customerCtx);

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', customerId: 'cust-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result.desiredPresentation).toBe('LOCK');
    expect(result.osEnforcement).toBe('NONE');
    expect(result.phoneLockedByMdm).toBe(false);
    expect(result.merchantName).toBe('Anaheim Shop');
    expect(result.disclaimer).toMatch(/not in Single App Mode/i);
  });

  it('rejects staff context', async () => {
    await expect(
      service.listContracts({
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: null,
        audience: 'staff',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
