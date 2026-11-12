import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  ContractStatus,
  ImeiStatus,
  InterestMethod,
  PlatformRole,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    application: { findFirst: jest.fn() },
    imeiUnit: { findFirst: jest.fn() },
    contract: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    contractVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    paymentScheduleItem: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const service = new ContractsService(prisma as never);

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
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  });

  it('rejects create without tenant context', async () => {
    await expect(
      service.createFromApplication(noTenantCtx, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects create when application is not APPROVED', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
    });

    await expect(
      service.createFromApplication(tenantCtx, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });

  it('creates DRAFT contract with version and schedule items', async () => {
    const createdAt = new Date('2026-01-10T00:00:00.000Z');
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.APPROVED,
    });
    prisma.imeiUnit.findFirst.mockResolvedValue({
      id: 'imei-1',
      tenantId: 'tenant-a',
      status: ImeiStatus.RESERVED,
    });
    prisma.contract.findFirst.mockResolvedValue(null);
    prisma.contract.create.mockResolvedValue({
      id: 'contract-1',
      tenantId: 'tenant-a',
      applicationId: 'app-1',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      status: ContractStatus.DRAFT,
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      financedAmount: new Prisma.Decimal('10000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      currency: 'THB',
      activatedAt: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    prisma.contractVersion.create.mockResolvedValue({
      id: 'version-1',
      tenantId: 'tenant-a',
      contractId: 'contract-1',
      version: 1,
      termsJson: { scheduleVersion: 'r1d-v1' },
      scheduleHash: 'hash-1',
      createdAt,
    });
    prisma.paymentScheduleItem.createMany.mockResolvedValue({ count: 6 });
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        tenantId: 'tenant-a',
        contractId: 'contract-1',
        contractVersionId: 'version-1',
        seq: 1,
        dueDate: new Date('2026-02-10T00:00:00.000Z'),
        principalDue: new Prisma.Decimal('1666.67'),
        interestDue: new Prisma.Decimal('100.00'),
        feesDue: new Prisma.Decimal('0.00'),
        totalDue: new Prisma.Decimal('1766.67'),
        status: ScheduleItemStatus.PENDING,
      },
    ]);

    await expect(
      service.createFromApplication(tenantCtx, '11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'contract-1',
        status: ContractStatus.DRAFT,
        financedAmount: '10000.00',
        version: expect.objectContaining({
          version: 1,
        }),
      }),
    );
    expect(prisma.contractVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: 'contract-1',
          version: 1,
        }),
      }),
    );
  });

  it('rejects create when open contract already exists for application', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.APPROVED,
    });
    prisma.imeiUnit.findFirst.mockResolvedValue({
      id: 'imei-1',
      tenantId: 'tenant-a',
      status: ImeiStatus.RESERVED,
    });
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract-open-1',
      status: ContractStatus.DRAFT,
    });

    await expect(
      service.createFromApplication(tenantCtx, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists contracts by tenant', async () => {
    prisma.contract.findMany.mockResolvedValue([
      {
        id: 'contract-1',
        tenantId: 'tenant-a',
        applicationId: 'app-1',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        status: ContractStatus.DRAFT,
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('2000.00'),
        financedAmount: new Prisma.Decimal('10000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        currency: 'THB',
        activatedAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      },
    ]);

    await expect(service.list(tenantCtx)).resolves.toEqual([
      expect.objectContaining({
        id: 'contract-1',
        financedAmount: '10000.00',
      }),
    ]);
  });

  it('gets contract by id with latest version and schedule', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract-1',
      tenantId: 'tenant-a',
      applicationId: 'app-1',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      status: ContractStatus.DRAFT,
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('2000.00'),
      financedAmount: new Prisma.Decimal('10000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      currency: 'THB',
      activatedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    prisma.contractVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      tenantId: 'tenant-a',
      contractId: 'contract-1',
      version: 1,
      termsJson: { scheduleVersion: 'r1d-v1' },
      scheduleHash: 'hash-1',
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        tenantId: 'tenant-a',
        contractId: 'contract-1',
        contractVersionId: 'version-1',
        seq: 1,
        dueDate: new Date('2026-02-10T00:00:00.000Z'),
        principalDue: new Prisma.Decimal('1666.67'),
        interestDue: new Prisma.Decimal('100.00'),
        feesDue: new Prisma.Decimal('0.00'),
        totalDue: new Prisma.Decimal('1766.67'),
        status: ScheduleItemStatus.PENDING,
      },
    ]);

    await expect(service.getById(tenantCtx, 'contract-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'contract-1',
        version: expect.objectContaining({
          id: 'version-1',
        }),
      }),
    );
  });

  it('throws NotFound when contract does not exist in tenant', async () => {
    prisma.contract.findFirst.mockResolvedValue(null);

    await expect(service.getById(tenantCtx, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
