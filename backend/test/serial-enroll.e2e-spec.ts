import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Serial unit through contract, QR, and check-in (e2e)', () => {
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
    process.env.DPC_COMPONENT_NAME =
      'com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver';
    process.env.DPC_DOWNLOAD_URL = 'https://downloads.example.test/dpc.apk';
    process.env.DPC_PACKAGE_CHECKSUM = createHash('sha256')
      .update('phase2-dpc')
      .digest('base64url');
    process.env.DPC_ENROLLMENT_ENDPOINT =
      'https://api.example.test/api/v1/devices/enroll/check-in';
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdTenantIds.length > 0) {
      await prisma.deviceAuditEvent.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.deviceContractBinding.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.deviceActivation.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.deviceEnrollmentSession.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.tenantShopSetup.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.device.deleteMany({
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
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.branch.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
    }

    await app.close();
  });

  it('stocks a Wi-Fi-only serial, activates a contract, issues a DPC QR, and checks in', async () => {
    const now = Date.now();
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Serial Shop ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `serial-owner-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Serial Owner',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Serial Other ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `serial-other-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Serial Other',
      })
      .expect(201);
    trackRegistration(regB.body);

    const tokenA = regA.body.data.accessToken as string;
    const tokenB = regB.body.data.accessToken as string;
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: regA.body.data.user.tenantId as string },
    });

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Wi-Fi tablet', brand: 'Lab' })
      .expect(201);
    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/variants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sku: `WIFI-${now}`,
        color: 'Gray',
        storage: '64GB',
        price: '9000.00',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branch.id,
        variantId: variant.body.data.id,
        reason: 'missing identity',
      })
      .expect(400);

    const received = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branch.id,
        variantId: variant.body.data.id,
        serial: `TABWIFI${now}`,
        reason: 'Wi-Fi only unit',
      })
      .expect(201);
    expect(received.body.data.imei).toBeNull();
    expect(received.body.data.serial).toBe(`TABWIFI${now}`);
    const imeiUnitId = received.body.data.id as string;

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Serial Customer',
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
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
      'base64',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/kyc-cases/${caseId}/documents`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('type', 'ID_FRONT')
      .attach('file', tinyPng, {
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
    const draftApp = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId,
        imeiUnitId,
        planId: plans.body.data[0].id as string,
        principal: '9000.00',
        downPayment: '1000.00',
      })
      .expect(201);
    const applicationId = draftApp.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/decision`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ decision: 'APPROVE', reason: 'ok' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/applications/contracts')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    const createdContract = await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const contractId = createdContract.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/contracts/${contractId}/activate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/v1/devices/shop-setup')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        dpcAttested: true,
        googleAccountReady: true,
        wipeNeedsOnDeviceUnlock: true,
        noRemoteFrpBypass: true,
      })
      .expect(200);

    const session = await request(app.getHttpServer())
      .post('/api/v1/devices/enrollment-sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', `serial-enroll-${now}`)
      .send({ contractId, platform: 'ANDROID' })
      .expect(201);
    const sessionId = session.body.data.id as string;
    const qr = await request(app.getHttpServer())
      .post(`/api/v1/devices/enrollment-sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const bundle = qr.body.data.payload[
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE'
    ] as { enrollmentToken: string; enrollmentSessionId: string };
    expect(bundle.enrollmentToken).toMatch(/^enc_/);
    expect(bundle.enrollmentSessionId).toBe(sessionId);

    const checkedIn = await request(app.getHttpServer())
      .post('/api/v1/devices/enroll/check-in')
      .set('X-Enrollment-Token', bundle.enrollmentToken)
      .send({ deviceOwner: true, sessionId })
      .expect(201);
    expect(checkedIn.body.data.deviceOwner).toBe(true);
    const deviceId = checkedIn.body.data.deviceId as string;

    await request(app.getHttpServer())
      .get(`/api/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const stored = await prisma.deviceEnrollmentSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(stored.status).toBe('ENROLLING');
    expect(stored.imeiUnitId).toBe(imeiUnitId);
    const unit = await prisma.imeiUnit.findUniqueOrThrow({
      where: { id: imeiUnitId },
    });
    expect(unit.imei).toBeNull();
    expect(unit.serial).toBe(`TABWIFI${now}`);
  });
});
