import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
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

describe('Customer portal (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  function trackRegistration(regBody: RegistrationBody) {
    createdUserIds.push(regBody.data.user.id);
    createdTenantIds.push(regBody.data.user.tenantId);
  }

  async function registerOwner(suffix: string): Promise<RegistrationBody> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Portal Tenant ${suffix}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `portal-owner-${suffix}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: `Portal Owner ${suffix}`,
      })
      .expect(201);
    trackRegistration(response.body as RegistrationBody);
    return response.body as RegistrationBody;
  }

  async function tenantSlug(token: string): Promise<string> {
    const me = await request(app.getHttpServer())
      .get('/api/v1/tenants/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return me.body.data.slug as string;
  }

  async function createActiveContract(input: {
    token: string;
    tenantId: string;
    now: number;
  }): Promise<{ contractId: string; phone: string }> {
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: input.tenantId },
      select: { id: true },
    });
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${input.token}`)
      .send({ name: 'Portal Phone', brand: 'TestBrand' })
      .expect(201);
    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/variants`)
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        sku: `PORTAL-SKU-${input.now}`,
        color: 'Black',
        storage: '128GB',
        price: '12000.00',
      })
      .expect(201);
    const imei = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        branchId: branch.id,
        variantId: variant.body.data.id,
        imei: `358${String(input.now).slice(-12)}`,
        reason: 'Receive IMEI for customer portal',
      })
      .expect(201);
    const phone = `09${String(input.now).slice(-8)}`;
    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${input.token}`)
      .send({
        fullName: 'Portal Customer',
        phone,
        nationalId: '1234567890123',
      })
      .expect(201);
    const caseId = (
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${customer.body.data.id}/kyc-cases`)
        .set('Authorization', `Bearer ${input.token}`)
        .expect(201)
    ).body.data.id as string;
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
      .send({ decision: 'APPROVE', reason: 'KYC approved.' })
      .expect(201);
    const plans = await request(app.getHttpServer())
      .get('/api/v1/installment-plans')
      .set('Authorization', `Bearer ${input.token}`)
      .expect(200);
    const applicationId = (
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${input.token}`)
        .send({
          customerId: customer.body.data.id,
          imeiUnitId: imei.body.data.id,
          planId: plans.body.data[0].id,
          principal: '12000.00',
          downPayment: '2000.00',
        })
        .expect(201)
    ).body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/decision`)
      .set('Authorization', `Bearer ${input.token}`)
      .send({ decision: 'APPROVE', reason: 'Approved.' })
      .expect(201);
    const contractId = (
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${applicationId}/contracts`)
        .set('Authorization', `Bearer ${input.token}`)
        .expect(201)
    ).body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${input.token}`)
      .expect(201);
    return { contractId, phone };
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
      await prisma.customerOtpChallenge.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
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

  it('logs a customer in with sandbox OTP and isolates contracts/intents', async () => {
    const now = Date.now();
    const regA = await registerOwner(`a-${now}`);
    const regB = await registerOwner(`b-${now}`);
    const tokenA = regA.data.accessToken;
    const tokenB = regB.data.accessToken;
    const slugA = await tenantSlug(tokenA);
    const slugB = await tenantSlug(tokenB);

    const publicTenant = await request(app.getHttpServer())
      .get(`/api/v1/public/tenants/${slugA}`)
      .expect(200);
    expect(publicTenant.body.data.slug).toBe(slugA);

    const seeded = await createActiveContract({
      token: tokenA,
      tenantId: regA.data.user.tenantId,
      now,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/request')
      .send({ tenantSlug: slugA, phone: seeded.phone })
      .expect(201);

    const verified = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/verify')
      .send({ tenantSlug: slugA, phone: seeded.phone, code: '123456' })
      .expect(201);
    const customerToken = verified.body.data.accessToken as string;
    expect(customerToken).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/v1/contracts')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(401);

    const mine = await request(app.getHttpServer())
      .get('/api/v1/me/contracts')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].id).toBe(seeded.contractId);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/me/contracts/${seeded.contractId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(detail.body.data.scheduleItems[0].amountPaid).toBeDefined();

    const intent = await request(app.getHttpServer())
      .post(`/api/v1/me/contracts/${seeded.contractId}/payment-intents`)
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `cust-${now}`)
      .send({ amount: '100.00' })
      .expect(201);
    expect(intent.body.data.status).toBe('AWAITING_PROVIDER');
    expect(intent.body.data.createdByCustomerId).toBeTruthy();
    expect(intent.body.data.qrPayload).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/request')
      .send({ tenantSlug: slugB, phone: seeded.phone })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/me/contracts/${seeded.contractId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(401);
  });
});
