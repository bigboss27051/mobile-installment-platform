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
      update: jest.fn(),
      updateMany: jest.fn(),
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
    prisma.paymentIntent.update.mockImplementation(({ data }) =>
      Promise.resolve({
        ...intentRecord,
        ...data,
        qrPayloadJson: data.qrPayloadJson,
        updatedAt: createdAt,
      }),
    );
    prisma.paymentIntent.updateMany.mockResolvedValue({ count: 1 });
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

  it('resumes existing CREATED intent on idempotency reuse', async () => {
    const createdIntent = {
      ...intentRecord,
      status: PaymentIntentStatus.CREATED,
      providerRef: null,
      qrPayloadJson: Prisma.JsonNull,
    };
    const resumedIntent = {
      ...createdIntent,
      status: PaymentIntentStatus.AWAITING_PROVIDER,
      provider: 'sandbox',
      providerRef: 'sandbox_ref',
      qrPayloadJson: { type: 'promptpay' },
      updatedAt: createdAt,
    };
    prisma.paymentIntent.findFirst
      .mockResolvedValueOnce(createdIntent)
      .mockResolvedValueOnce(resumedIntent);

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: createdIntent.id,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        providerRef: 'sandbox_ref',
      }),
    );
    expect(gateway.createPromptPayIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: createdIntent.id,
      amount: '1000.00',
      currency: 'THB',
    });
    expect(prisma.paymentIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: createdIntent.id,
        tenantId: 'tenant-a',
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: expect.objectContaining({
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        provider: 'sandbox',
        providerRef: 'sandbox_ref',
        qrPayloadJson: { type: 'promptpay' },
      }),
    });
    expect(prisma.paymentIntent.create).not.toHaveBeenCalled();
  });

  it('retries existing FAILED intent on idempotency reuse', async () => {
    const failedIntent = {
      ...intentRecord,
      status: PaymentIntentStatus.FAILED,
      providerRef: null,
      qrPayloadJson: Prisma.JsonNull,
    };
    const resumedIntent = {
      ...failedIntent,
      status: PaymentIntentStatus.AWAITING_PROVIDER,
      provider: 'sandbox',
      providerRef: 'sandbox_ref',
      qrPayloadJson: { type: 'promptpay' },
      updatedAt: createdAt,
    };
    prisma.paymentIntent.findFirst
      .mockResolvedValueOnce(failedIntent)
      .mockResolvedValueOnce(resumedIntent);

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: failedIntent.id,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        providerRef: 'sandbox_ref',
      }),
    );
    expect(gateway.createPromptPayIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: failedIntent.id,
      amount: '1000.00',
      currency: 'THB',
    });
    expect(prisma.paymentIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: failedIntent.id,
        tenantId: 'tenant-a',
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: expect.objectContaining({
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        provider: 'sandbox',
        providerRef: 'sandbox_ref',
        qrPayloadJson: { type: 'promptpay' },
      }),
    });
    expect(prisma.paymentIntent.create).not.toHaveBeenCalled();
  });

  it('does not call gateway for existing AWAITING_PROVIDER intent on idempotency reuse', async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue(intentRecord);

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: intentRecord.id,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        providerRef: intentRecord.providerRef,
      }),
    );
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.create).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
  });

  it('rejects idempotency reuse with different payload using 409', async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue(intentRecord);

    await expect(
      service.createIntent(tenantCtx, 'contract-2', '1000.00', 'idem-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.01', 'idem-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.create).not.toHaveBeenCalled();
  });

  it('returns winner intent when unique insert loses an idempotency race', async () => {
    prisma.paymentIntent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(intentRecord);
    prisma.paymentIntent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: intentRecord.id,
        amount: '1000.00',
        status: PaymentIntentStatus.AWAITING_PROVIDER,
      }),
    );
    expect(gateway.createPromptPayIntent).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
  });

  it('creates intent before calling gateway, then updates provider fields', async () => {
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

    expect(prisma.paymentIntent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        contractId: 'contract-1',
        amount: expect.any(Prisma.Decimal),
        currency: 'THB',
        idempotencyKey: 'idem-1',
        status: PaymentIntentStatus.CREATED,
        provider: 'sandbox',
        providerRef: null,
        qrPayloadJson: Prisma.JsonNull,
        createdByUserId: 'user-1',
      }),
    });
    expect(gateway.createPromptPayIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: expect.any(String),
      amount: '1000.00',
      currency: 'THB',
    });
    expect(prisma.paymentIntent.update).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        provider: 'sandbox',
        providerRef: 'sandbox_ref',
        qrPayloadJson: { type: 'promptpay' },
      }),
    });
    expect(
      prisma.paymentIntent.create.mock.invocationCallOrder[0],
    ).toBeLessThan(gateway.createPromptPayIntent.mock.invocationCallOrder[0]);
    expect(
      gateway.createPromptPayIntent.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.paymentIntent.update.mock.invocationCallOrder[0]);
  });

  it('marks the created intent FAILED when gateway creation fails', async () => {
    gateway.createPromptPayIntent.mockRejectedValue(new Error('gateway down'));

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).rejects.toThrow('gateway down');
    expect(prisma.paymentIntent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: PaymentIntentStatus.CREATED,
      }),
    });
    expect(prisma.paymentIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: expect.any(String),
        tenantId: 'tenant-a',
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: {
        status: PaymentIntentStatus.FAILED,
      },
    });
  });

  it('does not clobber AWAITING_PROVIDER when resume gateway fails after peer wins', async () => {
    const createdIntent = {
      ...intentRecord,
      status: PaymentIntentStatus.CREATED,
      providerRef: null,
      qrPayloadJson: Prisma.JsonNull,
    };
    const peerWonIntent = {
      ...createdIntent,
      status: PaymentIntentStatus.AWAITING_PROVIDER,
      provider: 'sandbox',
      providerRef: 'sandbox_11111111-1111-4111-8111-111111111111',
      qrPayloadJson: { type: 'promptpay' },
    };
    prisma.paymentIntent.findFirst
      .mockResolvedValueOnce(createdIntent)
      .mockResolvedValueOnce(peerWonIntent);
    gateway.createPromptPayIntent.mockRejectedValue(new Error('gateway down'));
    prisma.paymentIntent.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: createdIntent.id,
        status: PaymentIntentStatus.AWAITING_PROVIDER,
        providerRef: peerWonIntent.providerRef,
      }),
    );

    expect(prisma.paymentIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: createdIntent.id,
        tenantId: 'tenant-a',
        status: {
          in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.FAILED],
        },
      },
      data: {
        status: PaymentIntentStatus.FAILED,
      },
    });
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
  });

  it('rethrows when resume gateway fails and intent remains FAILED', async () => {
    const failedIntent = {
      ...intentRecord,
      status: PaymentIntentStatus.FAILED,
      providerRef: null,
      qrPayloadJson: Prisma.JsonNull,
    };
    prisma.paymentIntent.findFirst
      .mockResolvedValueOnce(failedIntent)
      .mockResolvedValueOnce(failedIntent);
    gateway.createPromptPayIntent.mockRejectedValue(new Error('gateway down'));
    prisma.paymentIntent.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.createIntent(tenantCtx, 'contract-1', '1000.00', 'idem-1'),
    ).rejects.toThrow('gateway down');
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

  it('returns 404 when getting an intent outside the tenant', async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue(null);

    await expect(service.getById(tenantCtx, 'intent-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.paymentIntent.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'intent-1',
        tenantId: 'tenant-a',
      },
    });
  });
});
