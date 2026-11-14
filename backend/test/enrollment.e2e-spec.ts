import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Device enrollment sessions (e2e)', () => {
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
      await prisma.deviceEnrollmentSession.deleteMany({
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

    await app.close();
  });

  it('creates Android enrollment sessions with isolation, stub QR without Wi-Fi secrets, and cancel', async () => {
    const now = Date.now();

    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Enroll Tenant A ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `enroll-owner-a-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Enroll Owner A',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Enroll Tenant B ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `enroll-owner-b-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Enroll Owner B',
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
      .send({ name: 'Enroll Phone', brand: 'TestBrand' })
      .expect(201);

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/variants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sku: `ENROLL-SKU-${now}`,
        color: 'Black',
        storage: '128GB',
        price: '12000.00',
      })
      .expect(201);

    const receive = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId: variant.body.data.id,
        imei: `359${String(now).slice(-12)}`,
        reason: 'Receive for enrollment',
      })
      .expect(201);
    const imeiUnitId = receive.body.data.id as string;

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Enroll Customer',
        phone: `08${String(now).slice(-8)}`,
        nationalId: '1234567890123',
      })
      .expect(201);
    const customerId = customer.body.data.id as string;

    const kycCase = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/kyc-cases`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const caseId = kycCase.body.data.id as string;

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
      .send({ decision: 'APPROVE', reason: 'ok' })
      .expect(201);

    const plans = await request(app.getHttpServer())
      .get('/api/v1/installment-plans')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const planId = plans.body.data[0].id as string;

    const draftApp = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId,
        planId,
        principal: '12000.00',
        downPayment: '2000.00',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draftApp.body.data.id}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draftApp.body.data.id}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ decision: 'APPROVE', reason: 'ok' })
      .expect(201);

    const createdContract = await request(app.getHttpServer())
      .post(`/api/v1/applications/${draftApp.body.data.id}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const contractId = createdContract.body.data.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/devices/enrollment-sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', `enroll-${now}`)
      .send({ contractId, platform: 'ANDROID' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const createdSession = await request(app.getHttpServer())
      .post('/api/v1/devices/enrollment-sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', `enroll-${now}`)
      .send({ contractId, platform: 'ANDROID' })
      .expect(201);

    expect(createdSession.body.data.status).toBe('WAITING_FOR_DEVICE');
    expect(createdSession.body.data.enrollmentToken).toMatch(/^enc_/);
    expect(createdSession.body.data.tokenHash).toBeUndefined();

    const replay = await request(app.getHttpServer())
      .post('/api/v1/devices/enrollment-sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', `enroll-${now}`)
      .send({ contractId, platform: 'ANDROID' })
      .expect(201);
    expect(replay.body.data.id).toBe(createdSession.body.data.id);
    expect(replay.body.data.enrollmentToken).toBeUndefined();

    const sessionId = createdSession.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/devices/enrollment-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const qr = await request(app.getHttpServer())
      .post(`/api/v1/devices/enrollment-sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    expect(qr.body.data.format).toBe('ANDROID_ENTERPRISE_QR');
    expect(JSON.stringify(qr.body.data.payload)).not.toMatch(/WIFI_PASSWORD/i);
    expect(qr.body.data.payloadFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const iosSession = await request(app.getHttpServer())
      .post('/api/v1/devices/enrollment-sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', `enroll-ios-${now}`)
      .send({ contractId, platform: 'IOS' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/devices/enrollment-sessions/${iosSession.body.data.id}/qr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/devices/enrollment-sessions/${sessionId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    expect(cancelled.body.data.status).toBe('CANCELLED');
  });
});
