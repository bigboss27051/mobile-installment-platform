import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Application + scorecard isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  function trackRegistration(regBody: {
    data: { user: { id: string; tenantId: string } };
  }) {
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
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

    await app.close();
  });

  it('supports submit/decision flow, scorecard creation, and tenant isolation', async () => {
    const now = Date.now();

    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Application Tenant A ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `app-owner-a-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Application Owner A',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Application Tenant B ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `app-owner-b-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Application Owner B',
      })
      .expect(201);
    trackRegistration(regB.body);

    const tokenA = regA.body.data.accessToken as string;
    const tokenB = regB.body.data.accessToken as string;
    const tenantAId = regA.body.data.user.tenantId as string;
    const branchAId = await resolveBranchIdForTenant(tenantAId);

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Galaxy S24 Ultra',
        brand: 'Samsung',
      })
      .expect(201);
    const productId = product.body.data.id as string;

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sku: `APP-SKU-${now}`,
        color: 'Black',
        storage: '256GB',
        price: '38990.00',
      })
      .expect(201);
    const variantId = variant.body.data.id as string;

    const imeiOne = `359${String(now).slice(-12)}`;
    const receiveOne = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId,
        imei: imeiOne,
        reason: 'Receive IMEI #1 for app flow',
      })
      .expect(201);
    const imeiUnitOneId = receiveOne.body.data.id as string;

    const imeiTwo = `860${String(now + 1).slice(-12)}`;
    const receiveTwo = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId,
        imei: imeiTwo,
        reason: 'Receive IMEI #2 for reject flow',
      })
      .expect(201);
    const imeiUnitTwoId = receiveTwo.body.data.id as string;

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Application Customer',
        phone: `08${String(now).slice(-8)}`,
        nationalId: '1234567890123',
      })
      .expect(201);
    const customerId = customer.body.data.id as string;

    const createCase = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/kyc-cases`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const caseId = createCase.body.data.id as string;

    const tinyPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
      'base64',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/documents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('type', 'ID_FRONT')
      .attach('file', tinyPngBuffer, {
        filename: 'id-front.png',
        contentType: 'image/png',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/ocr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/review`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        decision: 'APPROVE',
        reason: 'KYC approved for application checks.',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/v1/installment-plans')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(Array.isArray(plans.body.data)).toBe(true);
    expect(plans.body.data.length).toBeGreaterThan(0);
    const planId = plans.body.data[0].id as string;

    const draftApplication = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId: imeiUnitOneId,
        planId,
        principal: '38990.00',
        downPayment: '3990.00',
      })
      .expect(201);
    const applicationId = draftApplication.body.data.id as string;
    expect(draftApplication.body.data.status).toBe('DRAFT');
    expect(draftApplication.body.data.scorecard).toBeNull();

    const submittedApplication = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    expect(submittedApplication.body.data.status).toBe('SUBMITTED');
    expect(submittedApplication.body.data.scorecard).not.toBeNull();
    expect(submittedApplication.body.data.scorecard.score).toEqual(expect.any(Number));

    const reservedImei = await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitOneId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(reservedImei.body.data.status).toBe('RESERVED');

    const approvedApplication = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        decision: 'APPROVE',
        reason: 'Scorecard and KYC verified.',
      })
      .expect(201);
    expect(approvedApplication.body.data.status).toBe('APPROVED');

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${applicationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const draftRejectedPath = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId: imeiUnitTwoId,
        planId,
        principal: '38990.00',
        downPayment: '3990.00',
      })
      .expect(201);
    const rejectedPathApplicationId = draftRejectedPath.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${rejectedPathApplicationId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const rejectedApplication = await request(app.getHttpServer())
      .post(`/api/v1/applications/${rejectedPathApplicationId}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        decision: 'REJECT',
        reason: 'Rejected for release-flow verification.',
      })
      .expect(201);
    expect(rejectedApplication.body.data.status).toBe('REJECTED');

    const releasedImei = await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitTwoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(releasedImei.body.data.status).toBe('AVAILABLE');
  });
});
