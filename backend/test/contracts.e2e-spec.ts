import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Contracts endpoints (e2e)', () => {
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

    await app.close();
  });

  it('supports contract activate flow with schedule isolation and draft cancel path', async () => {
    const now = Date.now();

    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Contract Tenant A ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `contract-owner-a-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Contract Owner A',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Contract Tenant B ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `contract-owner-b-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Contract Owner B',
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
        name: 'Contract Test Phone',
        brand: 'TestBrand',
      })
      .expect(201);
    const productId = product.body.data.id as string;

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sku: `CONTRACT-SKU-${now}`,
        color: 'Black',
        storage: '128GB',
        price: '12000.00',
      })
      .expect(201);
    const variantId = variant.body.data.id as string;

    const receiveImeiOne = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId,
        imei: `359${String(now).slice(-12)}`,
        reason: 'Receive IMEI #1 for contract activation flow',
      })
      .expect(201);
    const imeiUnitOneId = receiveImeiOne.body.data.id as string;

    const receiveImeiTwo = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId,
        imei: `860${String(now + 1).slice(-12)}`,
        reason: 'Receive IMEI #2 for contract cancellation flow',
      })
      .expect(201);
    const imeiUnitTwoId = receiveImeiTwo.body.data.id as string;

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Contract Customer',
        phone: `09${String(now).slice(-8)}`,
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
        reason: 'KYC approved for contract flow.',
      })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/v1/installment-plans')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(Array.isArray(plans.body.data)).toBe(true);
    expect(plans.body.data.length).toBeGreaterThan(0);
    const planId = plans.body.data[0].id as string;

    const draftActivationApp = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId: imeiUnitOneId,
        planId,
        principal: '12000.00',
        downPayment: '2000.00',
      })
      .expect(201);
    const activationApplicationId = draftActivationApp.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${activationApplicationId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const approvedActivationApp = await request(app.getHttpServer())
      .post(`/api/v1/applications/${activationApplicationId}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        decision: 'APPROVE',
        reason: 'Approved for contract activation path.',
      })
      .expect(201);
    expect(approvedActivationApp.body.data.status).toBe('APPROVED');

    const created = await request(app.getHttpServer())
      .post(`/api/v1/applications/${activationApplicationId}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(created.body.data.status).toBe('DRAFT');
    expect(created.body.data.applicationId).toBe(activationApplicationId);
    expect(created.body.data.version.version).toBe(1);
    expect(created.body.data.version.scheduleHash).toMatch(/^[a-f0-9]{64}$/);
    expect(Array.isArray(created.body.data.scheduleItems)).toBe(true);
    expect(created.body.data.scheduleItems.length).toBe(created.body.data.termMonths);
    expect(created.body.data.scheduleItems[0].status).toBe('PENDING');

    const contractId = created.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${activationApplicationId}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(409);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/contracts')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
    expect(listed.body.data.some((row: { id: string }) => row.id === contractId)).toBe(true);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(fetched.body.data.id).toBe(contractId);
    expect(fetched.body.data.version.version).toBe(1);
    expect(Array.isArray(fetched.body.data.scheduleItems)).toBe(true);

    const activated = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    expect(activated.body.data.status).toBe('ACTIVE');
    expect(activated.body.data.activatedAt).toEqual(expect.any(String));

    const soldImei = await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitOneId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(soldImei.body.data.status).toBe('SOLD');

    await request(app.getHttpServer())
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const draftCancelApp = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId: imeiUnitTwoId,
        planId,
        principal: '12000.00',
        downPayment: '2000.00',
      })
      .expect(201);
    const cancelApplicationId = draftCancelApp.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${cancelApplicationId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const approvedCancelApp = await request(app.getHttpServer())
      .post(`/api/v1/applications/${cancelApplicationId}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        decision: 'APPROVE',
        reason: 'Approved for contract cancellation path.',
      })
      .expect(201);
    expect(approvedCancelApp.body.data.status).toBe('APPROVED');

    const createdCancelPath = await request(app.getHttpServer())
      .post(`/api/v1/applications/${cancelApplicationId}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const cancelContractId = createdCancelPath.body.data.id as string;
    expect(createdCancelPath.body.data.status).toBe('DRAFT');

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${cancelContractId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(cancelled.body.data.cancelledAt).toEqual(expect.any(String));

    const reservedImei = await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitTwoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(reservedImei.body.data.status).toBe('RESERVED');
  });
});
