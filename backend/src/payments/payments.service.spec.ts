import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ContractStatus,
  PaymentIntentStatus,
  PlatformRole,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    contract: { findFirst: jest.fn() },
    paymentScheduleItem: { findMany: jest.fn() },
    paymentIntent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const gateway = {
    createPromptPayIntent: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    parseWebhookEvent: jest.fn(),
  };

  const service = new PaymentsService(prisma as never, gateway as never);

  const tenantCtx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_STAFF,
  };

  const activeContract = {
    id: 'contract-1',
    tenantId: 'tenant-a',
    status: ContractStatus.ACTIVE,
  };

  const createdAt = new Date('2026-03-01T00:00:00.000Z');

  const intentRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: 'tenant-a',
    contractId: 'contract-1',
    amount: new Prisma.Decimal('1000.00'),
    currency: 'THB',
    idempotencyKey: 'idem-1',
    status: PaymentIntentStatus.AWAITING_PROVIDER,
    provider: 'sandbox',
    providerRef: 'sandbox_11111111-1111-4111-8111-111111111111',
    qrPayloadJson: { type: 'promptpay' },
    createdByUserId: 'user-1',
    createdAt,
    updatedAt: createdAt,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.paymentIntent.findFirst.mockResolvedValue(null);
    prisma.contract.findFirst.mockResolvedValue(activeContract);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        totalDue: new Prisma.Decimal('1200.00'),
        amountPaid: new Prisma.Decimal('200.00'),
        status: ScheduleItemStatus.PARTIAL,
      },
      {
        id: 'item-2',
        totalDue: new Prisma.Decimal('500.00'),
        amountPaid: new Prisma.Decimal('0.00'),
        status: ScheduleItemStatus.PENDING,
      },
      {
        id: 'item-paid',
        totalDue: new Prisma.Decimal('400.00'),
        amountPaid: new Prisma.Decimal('400.00'),
        status: ScheduleItemStatus.PAID,
      },
    ]);
    gateway.createPromptPayIntent.mockResolvedValue({
      provider: 'sandbox',
      providerRef: 'sandbox_ref',
      qrPayload: { type: 'promptpay' },
    });
    prisma.paymentIntent.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...intentRecord,
        ...data,
        qrPayloadJson: data.qrPayloadJson,
      }),
    );
  });

  it('documents service-level handling for blank idempotency keys', async () => {
    await expect(
      service.createIntent(tenantCtx, 'contract-1', '100.00', ''),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
  });

  it('rejects overpayment above outstanding with 422', async () => {
    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1500.01', 'idem-1'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
  });

  it('returns existing intent on idempotency reuse', async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue(intentRecord);

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: intentRecord.id,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        amount: '1000.00',
      }),
    );
    expect(prisma.contract.findFirst).not.toHaveBeenCalled();
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.create).not.toHaveBeenCalled();
  });

  it('creates AWAITING_PROVIDER intent and calls gateway', async () => {
    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        amount: '1000.00',
        provider: 'sandbox',
        providerRef: 'sandbox_ref',
      }),
    );

    expect(gateway.createPromptPayIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: expect.any(String),
      amount: '1000.00',
      currency: 'THB',
    });
    expect(prisma.paymentIntent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        contractId: 'contract-1',
        amount: expect.any(Prisma.Decimal),
        currency: 'THB',
        idempotencyKey: 'idem-1',
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        provider: 'sandbox',
        providerRef: 'sandbox_ref',
        qrPayloadJson: { type: 'promptpay' },
        createdByUserId: 'user-1',
      }),
    });
  });

  it('rejects non-ACTIVE contracts with 409', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      ...activeContract,
      status: ContractStatus.DRAFT,
    });

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '100.00', 'idem-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
  });

  it('returns 404 for missing or cross-tenant contracts', async () => {
    prisma.contract.findFirst.mockResolvedValue(null);

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '100.00', 'idem-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
  });
});
