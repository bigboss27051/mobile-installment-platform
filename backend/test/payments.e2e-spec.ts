import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { signSandboxWebhook } from '../src/common/payments/sandbox-payment.adapter';
import { PrismaService } from '../src/prisma/prisma.service';

type RegistrationBody = {
  data: {
    accessToken: string;
    user: {
      id: string;
      tenantId: string;
    };
  };
};

type ScheduleItemResponse = {
  id: string;
  seq: number;
  totalDue: string;
  amountPaid: string;
  status: string;
};

describe('Payments endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  function trackRegistration(regBody: RegistrationBody) {
    createdUserIds.push(regBody.data.user.id);
    createdTenantIds.push(regBody.data.user.tenantId);
  }

  async function resolveBranchIdForTenant(tenantId: string): Promise<string> {
    const branch = await prisma.branch.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error(`No branch found for tenant ${tenantId}`);
    }
    return branch.id;
  }

  function toCents(amount: string): bigint {
    const [baht, satang = ''] = amount.split('.');
    return BigInt(baht) * 100n + BigInt(satang.padEnd(2, '0').slice(0, 2));
  }

  function fromCents(cents: bigint): string {
    const baht = cents / 100n;
    const satang = cents % 100n;
    return `${baht}.${satang.toString().padStart(2, '0')}`;
  }

  async function registerOwner(suffix: string): Promise<RegistrationBody> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Payment Tenant ${suffix}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `payment-owner-${suffix}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: `Payment Owner ${suffix}`,
      })
      .expect(201);
    trackRegistration(response.body as RegistrationBody);
    return response.body as RegistrationBody;
  }

  async function createActiveContract(input: {
    token: string;
    tenantId: string;
    now: number;
  }): Promise<{ contractId: string; scheduleItems: ScheduleItemResponse[] }> {
    const branchId = await resolveBranchIdForTenant(input.tenantId);

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        name: 'Payment Test Phone',
        brand: 'TestBrand',
      })
      .expect(201);
    const productId = product.body.data.id as string;

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        sku: `PAYMENT-SKU-${input.now}`,
        color: 'Black',
        storage: '128GB',
        price: '12000.00',
      })
      .expect(201);
    const variantId = variant.body.data.id as string;

    const receiveImei = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        branchId,
        variantId,
        imei: `359${String(input.now).slice(-12)}`,
        reason: 'Receive IMEI for payment allocation flow',
      })
      .expect(201);
    const imeiUnitId = receiveImei.body.data.id as string;

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        fullName: 'Payment Customer',
        phone: `08${String(input.now).slice(-8)}`,
        nationalId: '1234567890123',
      })
      .expect(201);
    const customerId = customer.body.data.id as string;

    const createCase = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/kyc-cases`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);
    const caseId = createCase.body.data.id as string;

    const tinyPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
      'base64',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/documents`)
      .set('Authorization', `Bearer ${input.token}`)
      .field('type', 'ID_FRONT')
      .attach('file', tinyPngBuffer, {
        filename: 'id-front.png',
        contentType: 'image/png',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/submit`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/ocr`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/review`)
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        decision: 'APPROVE',
        reason: 'KYC approved for payment flow.',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/v1/installment-plans')
      .set('Authorization', `Bearer ${input.token}`)
      .expect(200);
    expect(Array.isArray(plans.body.data)).toBe(true);
    expect(plans.body.data.length).toBeGreaterThan(0);
    const planId = plans.body.data[0].id as string;

    const draftApp = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        customerId,
        imeiUnitId,
        planId,
        principal: '12000.00',
        downPayment: '2000.00',
      })
      .expect(201);
    const applicationId = draftApp.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);

    const approvedApp = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/decision`)
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        decision: 'APPROVE',
        reason: 'Approved for payment flow.',
      })
      .expect(201);
    expect(approvedApp.body.data.status).toBe('APPROVED');

    const created = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/contracts`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);
    expect(created.body.data.status).toBe('DRAFT');
    expect(Array.isArray(created.body.data.scheduleItems)).toBe(true);
    expect(created.body.data.scheduleItems.length).toBeGreaterThanOrEqual(2);

    const contractId = created.body.data.id as string;
    const activated = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);
    expect(activated.body.data.status).toBe('ACTIVE');

    const scheduleItems = await prisma.paymentScheduleItem.findMany({
      where: { tenantId: input.tenantId, contractId },
      orderBy: { seq: 'asc' },
      select: {
        id: true,
        seq: true,
        totalDue: true,
        amountPaid: true,
        status: true,
      },
    });
    expect(scheduleItems.length).toBeGreaterThanOrEqual(2);

    return {
      contractId,
      scheduleItems: scheduleItems.map((item) => ({
        id: item.id,
        seq: item.seq,
        totalDue: item.totalDue.toFixed(2),
        amountPaid: item.amountPaid.toFixed(2),
        status: item.status,
      })),
    };
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdTenantIds.length > 0) {
      await prisma.ledgerEntry.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.allocation.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.paymentTransaction.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.paymentIntent.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.paymentScheduleItem.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.contractVersion.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.contract.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.approvalAction.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.scorecardResult.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.application.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.installmentPlan.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.kycReviewAction.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.kycDocument.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.kycCase.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.consent.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.customer.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.stockMovement.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.imeiUnit.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.productVariant.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.product.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
    }

    if (createdUserIds.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    if (createdTenantIds.length > 0) {
      await prisma.branch.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
    }

    await app?.close();
  });

  it('keeps payment intent, webhook allocation, and tenant isolation idempotent', async () => {
    const now = Date.now();
    const regA = await registerOwner(`a-${now}`);
    const regB = await registerOwner(`b-${now}`);
    const tokenA = regA.data.accessToken;
    const tokenB = regB.data.accessToken;
    const tenantAId = regA.data.user.tenantId;
    const idempotencyKey = `payment-e2e-${now}`;

    const { contractId, scheduleItems } = await createActiveContract({
      token: tokenA,
      tenantId: tenantAId,
      now,
    });
    const [firstScheduleItem, secondScheduleItem] = scheduleItems;
    const paymentAmount = fromCents(
      toCents(firstScheduleItem.totalDue) +
        toCents(secondScheduleItem.totalDue) / 2n,
    );

    const createdIntent = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/payment-intents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: paymentAmount })
      .expect(201);
    const intent = createdIntent.body.data as {
      id: string;
      providerRef: string;
      amount: string;
      status: string;
    };
    expect(intent.status).toBe('AWAITING_PROVIDER');
    expect(intent.providerRef).toEqual(expect.any(String));
    expect(intent.amount).toBe(paymentAmount);

    const reusedIntent = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/payment-intents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: paymentAmount })
      .expect(201);
    expect(reusedIntent.body.data.id).toBe(intent.id);

    await request(app.getHttpServer())
      .get(`/api/v1/payment-intents/${intent.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const badWebhookBody = Buffer.from(
      JSON.stringify({
        providerEventId: `evt-bad-${now}`,
        providerRef: intent.providerRef,
        amount: paymentAmount,
        status: 'SUCCEEDED',
      }),
    );
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/sandbox')
      .set('Content-Type', 'application/json')
      .set('x-mip-signature', 'bad-signature')
      .send(badWebhookBody.toString('utf8'))
      .expect(401);

    expect(
      await prisma.paymentTransaction.count({ where: { tenantId: tenantAId } }),
    ).toBe(0);
    expect(await prisma.allocation.count({ where: { tenantId: tenantAId } })).toBe(
      0,
    );
    expect(await prisma.ledgerEntry.count({ where: { tenantId: tenantAId } })).toBe(
      0,
    );

    const webhookBody = Buffer.from(
      JSON.stringify({
        providerEventId: `evt-success-${now}`,
        providerRef: intent.providerRef,
        amount: paymentAmount,
        status: 'SUCCEEDED',
      }),
    );
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    expect(webhookSecret).toEqual(expect.any(String));

    const webhook = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/sandbox')
      .set('Content-Type', 'application/json')
      .set('x-mip-signature', signSandboxWebhook(webhookBody, webhookSecret!))
      .send(webhookBody.toString('utf8'))
      .expect(201);
    expect(webhook.body.data.replay).toBe(false);
    expect(webhook.body.data.allocations).toEqual([
      { scheduleItemId: firstScheduleItem.id, amount: firstScheduleItem.totalDue },
      {
        scheduleItemId: secondScheduleItem.id,
        amount: fromCents(toCents(secondScheduleItem.totalDue) / 2n),
      },
    ]);

    const paidScheduleItems = await prisma.paymentScheduleItem.findMany({
      where: { tenantId: tenantAId, contractId },
      orderBy: { seq: 'asc' },
      select: { id: true, amountPaid: true, status: true },
    });
    const paidScheduleItemResults = paidScheduleItems.map((item) => ({
      id: item.id,
      amountPaid: item.amountPaid.toFixed(2),
      status: item.status,
    }));
    expect(paidScheduleItemResults[0]).toEqual(
      expect.objectContaining({
        id: firstScheduleItem.id,
        amountPaid: firstScheduleItem.totalDue,
        status: 'PAID',
      }),
    );
    expect(paidScheduleItemResults[1]).toEqual(
      expect.objectContaining({
        id: secondScheduleItem.id,
        amountPaid: fromCents(toCents(secondScheduleItem.totalDue) / 2n),
        status: 'PARTIAL',
      }),
    );

    const countsAfterWebhook = {
      allocations: await prisma.allocation.count({
        where: { tenantId: tenantAId },
      }),
      ledgerEntries: await prisma.ledgerEntry.count({
        where: { tenantId: tenantAId },
      }),
      transactions: await prisma.paymentTransaction.count({
        where: { tenantId: tenantAId },
      }),
    };
    expect(countsAfterWebhook).toEqual({
      allocations: 2,
      ledgerEntries: 2,
      transactions: 1,
    });

    const replayWebhook = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/sandbox')
      .set('Content-Type', 'application/json')
      .set('x-mip-signature', signSandboxWebhook(webhookBody, webhookSecret!))
      .send(webhookBody.toString('utf8'))
      .expect(201);
    expect(replayWebhook.body.data.replay).toBe(true);

    await expect(
      Promise.all([
        prisma.allocation.count({ where: { tenantId: tenantAId } }),
        prisma.ledgerEntry.count({ where: { tenantId: tenantAId } }),
        prisma.paymentTransaction.count({ where: { tenantId: tenantAId } }),
      ]),
    ).resolves.toEqual([
      countsAfterWebhook.allocations,
      countsAfterWebhook.ledgerEntries,
      countsAfterWebhook.transactions,
    ]);
  });
});
