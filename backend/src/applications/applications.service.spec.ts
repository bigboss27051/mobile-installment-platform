import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationDecision,
  ApplicationStatus,
  ImeiStatus,
  InterestMethod,
  KycCaseStatus,
  PlatformRole,
  Prisma,
  ScorecardBand,
  StockMovementType,
} from '@prisma/client';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  const inventory = {
    reserve: jest.fn(),
    release: jest.fn(),
  };

  const prisma = {
    $transaction: jest.fn(),
    customer: { findFirst: jest.fn() },
    kycCase: { findFirst: jest.fn() },
    installmentPlan: { findFirst: jest.fn() },
    imeiUnit: { findFirst: jest.fn(), updateMany: jest.fn() },
    stockMovement: { create: jest.fn() },
    application: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    approvalAction: {
      create: jest.fn(),
    },
  };

  const service = new ApplicationsService(prisma as never, inventory as never);

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

  it('maps unique violation on create to open-IMEI ConflictException', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.installmentPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
    });
    prisma.imeiUnit.findFirst.mockResolvedValue({ id: 'imei-1' });
    prisma.application.findFirst.mockResolvedValue(null);
    prisma.application.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate open imei', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(tenantCtx, {
        customerId: '11111111-1111-4111-8111-111111111111',
        imeiUnitId: '22222222-2222-4222-8222-222222222222',
        planId: '33333333-3333-4333-8333-333333333333',
        principal: '12000.00',
        downPayment: '2000.00',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Another open application already exists for this IMEI unit.',
      }),
    );
  });

  it('lists tenant-scoped applications', async () => {
    prisma.application.findMany.mockResolvedValue([
      {
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('10000.00'),
        downPayment: new Prisma.Decimal('1000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.DRAFT,
        submittedAt: null,
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scorecard: null,
      },
    ]);

    await expect(service.list(tenantCtx)).resolves.toEqual([
      expect.objectContaining({
        id: 'app-1',
        tenantId: 'tenant-a',
        principal: '10000.00',
        downPayment: '1000.00',
      }),
    ]);
    expect(prisma.application.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
      orderBy: { createdAt: 'desc' },
      include: { scorecard: true },
    });
  });

  it('gets application by id scoped to tenant', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('10000.00'),
      downPayment: new Prisma.Decimal('1000.00'),
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

    await expect(service.getById(tenantCtx, 'app-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'app-1',
        tenantId: 'tenant-a',
        annualRate: '12.00',
      }),
    );
    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'app-1',
        tenantId: 'tenant-a',
      },
      include: { scorecard: true },
    });
  });

  it('throws NotFound when getById missing or from another tenant', async () => {
    prisma.application.findFirst.mockResolvedValue(null);

    await expect(service.getById(tenantCtx, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks submit when customer has no approved KYC case', async () => {
    prisma.application.findFirst.mockResolvedValue({
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
    prisma.kycCase.findFirst.mockResolvedValue(null);

    await expect(service.submit(tenantCtx, 'app-1')).rejects.toBeInstanceOf(ConflictException);
    expect(inventory.reserve).not.toHaveBeenCalled();
  });

  it('submits DRAFT application, reserves IMEI, and persists scorecard', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
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
    prisma.kycCase.findFirst.mockResolvedValue({ id: 'kyc-1', status: KycCaseStatus.APPROVED });
    inventory.reserve.mockResolvedValue({ id: 'imei-1' });
    const submittedAt = new Date('2026-01-02T00:00:00.000Z');
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
      submittedAt,
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: submittedAt,
      scorecard: {
        id: 'sc-1',
        tenantId: 'tenant-a',
        applicationId: 'app-1',
        score: 85,
        band: ScorecardBand.HIGH,
        reasonsJson: [
          { code: 'DP_OK', message: 'Down payment is between 20% and 30% of principal' },
          { code: 'TERM_SHORT', message: 'Installment term is six months or shorter' },
        ],
        version: 'r1c-v1',
        createdAt: submittedAt,
      },
    });

    await expect(service.submit(tenantCtx, 'app-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'app-1',
        status: ApplicationStatus.SUBMITTED,
        submittedAt,
        scorecard: expect.objectContaining({
          score: 85,
          band: ScorecardBand.HIGH,
          version: 'r1c-v1',
        }),
      }),
    );

    expect(inventory.reserve).toHaveBeenCalledWith(tenantCtx, 'imei-1', {
      reason: 'application:app-1',
    });
    expect(prisma.application.update).toHaveBeenCalledTimes(1);
    expect(inventory.release).not.toHaveBeenCalled();
  });

  it('does not flip application status when reserve fails', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
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
    prisma.kycCase.findFirst.mockResolvedValue({ id: 'kyc-1', status: KycCaseStatus.APPROVED });
    inventory.reserve.mockRejectedValue(new ConflictException('IMEI unavailable'));

    await expect(service.submit(tenantCtx, 'app-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('releases reservation when DB write fails after reserve', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
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
    prisma.kycCase.findFirst.mockResolvedValue({ id: 'kyc-1', status: KycCaseStatus.APPROVED });
    inventory.reserve.mockResolvedValue({ id: 'imei-1' });
    prisma.application.update.mockRejectedValue(new Error('db exploded'));

    await expect(service.submit(tenantCtx, 'app-1')).rejects.toThrow('db exploded');
    expect(inventory.release).toHaveBeenCalledWith(tenantCtx, 'imei-1', {
      reason: 'application:app-1:compensation',
    });
  });

  it('maps computeScorecard errors to BadRequestException during submit', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('14000.00'),
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
    prisma.kycCase.findFirst.mockResolvedValue({ id: 'kyc-1', status: KycCaseStatus.APPROVED });
    inventory.reserve.mockResolvedValue({ id: 'imei-1' });

    await expect(service.submit(tenantCtx, 'app-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(inventory.release).toHaveBeenCalledWith(tenantCtx, 'imei-1', {
      reason: 'application:app-1:compensation',
    });
  });

  it('approves SUBMITTED application and writes audit action in one transaction', async () => {
    const decidedAt = new Date('2026-01-05T00:00:00.000Z');
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.application.updateMany.mockResolvedValue({ count: 1 });
    prisma.application.findFirst
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scorecard: null,
      })
      .mockResolvedValueOnce({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.APPROVED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: decidedAt,
      scorecard: null,
    });
    prisma.approvalAction.create.mockResolvedValue({ id: 'approval-1' });

    await expect(
      service.decision(tenantCtx, 'app-1', {
        decision: ApplicationDecision.APPROVE,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'app-1',
        status: ApplicationStatus.APPROVED,
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'app-1',
          tenantId: 'tenant-a',
          status: ApplicationStatus.SUBMITTED,
        },
        data: expect.objectContaining({
          status: ApplicationStatus.APPROVED,
          decidedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.approvalAction.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        applicationId: 'app-1',
        actorUserId: 'user-1',
        decision: ApplicationDecision.APPROVE,
        reason: undefined,
      },
    });
    expect(inventory.release).not.toHaveBeenCalled();
  });

  it('rejects SUBMITTED application, writes audit action, and releases reservation', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.application.updateMany.mockResolvedValue({ count: 1 });
    prisma.imeiUnit.findFirst.mockResolvedValue({
      id: 'imei-1',
      branchId: 'branch-1',
      status: ImeiStatus.RESERVED,
    });
    prisma.imeiUnit.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({ id: 'movement-1' });
    prisma.application.findFirst
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scorecard: null,
      })
      .mockResolvedValueOnce({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.REJECTED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: new Date('2026-01-05T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.approvalAction.create.mockResolvedValue({ id: 'approval-1' });

    await expect(
      service.decision(tenantCtx, 'app-1', {
        decision: ApplicationDecision.REJECT,
        reason: 'KYC mismatch',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'app-1',
        status: ApplicationStatus.REJECTED,
      }),
    );
    expect(prisma.approvalAction.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        applicationId: 'app-1',
        actorUserId: 'user-1',
        decision: ApplicationDecision.REJECT,
        reason: 'KYC mismatch',
      },
    });
    expect(inventory.release).not.toHaveBeenCalled();
    expect(prisma.imeiUnit.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'imei-1',
        tenantId: 'tenant-a',
        status: ImeiStatus.RESERVED,
      },
      data: {
        status: ImeiStatus.AVAILABLE,
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        imeiUnitId: 'imei-1',
        type: StockMovementType.RELEASE,
        reason: 'application:app-1:rejected',
      }),
    });
  });

  it('throws Conflict on second decision when transition update is stale', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.application.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.decision(tenantCtx, 'app-1', {
        decision: ApplicationDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.approvalAction.create).not.toHaveBeenCalled();
  });

  it('throws Conflict when cancel transition is stale after pre-read', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.application.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel(tenantCtx, 'app-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.imeiUnit.updateMany).not.toHaveBeenCalled();
  });

  it('cancels SUBMITTED application and releases reserved inventory in same transaction', async () => {
    prisma.application.findFirst
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scorecard: null,
      })
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.CANCELLED,
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        decidedAt: new Date('2026-01-05T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        scorecard: null,
      });
    prisma.application.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.imeiUnit.findFirst.mockResolvedValue({
      id: 'imei-1',
      branchId: 'branch-1',
      status: ImeiStatus.RESERVED,
    });
    prisma.imeiUnit.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({ id: 'movement-1' });

    await expect(service.cancel(tenantCtx, 'app-1')).resolves.toEqual(
      expect.objectContaining({
        status: ApplicationStatus.CANCELLED,
      }),
    );
    expect(inventory.release).not.toHaveBeenCalled();
    expect(prisma.imeiUnit.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'imei-1',
        tenantId: 'tenant-a',
        status: ImeiStatus.RESERVED,
      },
      data: {
        status: ImeiStatus.AVAILABLE,
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        imeiUnitId: 'imei-1',
        type: StockMovementType.RELEASE,
      }),
    });
  });

  it('denies decision for non-merchant roles', async () => {
    const supportCtx = {
      tenantId: 'tenant-a',
      userId: 'support-1',
      role: PlatformRole.SUPER_ADMIN,
    };

    await expect(
      service.decision(supportCtx, 'app-1', {
        decision: ApplicationDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.application.findFirst).not.toHaveBeenCalled();
  });

  it('rejects decision when status is not SUBMITTED', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
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
    prisma.application.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.decision(tenantCtx, 'app-1', {
        decision: ApplicationDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('cancels DRAFT application without releasing inventory', async () => {
    prisma.application.findFirst
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.DRAFT,
        submittedAt: null,
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scorecard: null,
      })
      .mockResolvedValueOnce({
        id: 'app-1',
        tenantId: 'tenant-a',
        customerId: 'customer-1',
        imeiUnitId: 'imei-1',
        planId: 'plan-1',
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('3000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: ApplicationStatus.CANCELLED,
        submittedAt: null,
        decidedAt: new Date('2026-01-05T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        scorecard: null,
      });
    prisma.application.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.cancel(tenantCtx, 'app-1')).resolves.toEqual(
      expect.objectContaining({
        status: ApplicationStatus.CANCELLED,
      }),
    );
    expect(prisma.application.updateMany).toHaveBeenCalledTimes(2);
    expect(inventory.release).not.toHaveBeenCalled();
  });

  it('rejects cancel when status is neither DRAFT nor SUBMITTED', async () => {
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: new Prisma.Decimal('12000.00'),
      downPayment: new Prisma.Decimal('3000.00'),
      termMonths: 6,
      interestMethod: InterestMethod.FLAT,
      annualRate: new Prisma.Decimal('12.00'),
      status: ApplicationStatus.APPROVED,
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      decidedAt: new Date('2026-01-05T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      scorecard: null,
    });
    prisma.application.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel(tenantCtx, 'app-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.application.updateMany).toHaveBeenCalled();
  });
});
