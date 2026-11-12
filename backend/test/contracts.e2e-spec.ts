import { INestApplication, ValidationPipe } from '@nestjs/common';
import { InterestMethod, Prisma } from '@prisma/client';
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
      await prisma.application.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      });
      await prisma.installmentPlan.deleteMany({
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

  it('creates draft contracts then supports list and get with tenant isolation', async () => {
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

    const plan = await prisma.installmentPlan.create({
      data: {
        tenantId: tenantAId,
        code: `CONTRACT-PLAN-${now}`,
        name: 'Contract plan',
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        termMonths: 6,
        active: true,
      },
    });

    const product = await prisma.product.create({
      data: {
        tenantId: tenantAId,
        name: 'Contract Test Phone',
        brand: 'TestBrand',
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        tenantId: tenantAId,
        productId: product.id,
        sku: `CONTRACT-SKU-${now}`,
        color: 'Black',
        storage: '128GB',
        price: new Prisma.Decimal('12000.00'),
      },
    });

    const imeiUnit = await prisma.imeiUnit.create({
      data: {
        tenantId: tenantAId,
        branchId: branchAId,
        variantId: variant.id,
        imei: `359${String(now).slice(-12)}`,
        status: 'RESERVED',
      },
    });

    const customer = await prisma.customer.create({
      data: {
        tenantId: tenantAId,
        fullName: 'Contract Customer',
        phone: `09${String(now).slice(-8)}`,
        nationalIdEncrypted: 'enc:placeholder',
        nationalIdHash: `hash-${now}`,
        nationalIdLast4: '0123',
      },
    });

    const application = await prisma.application.create({
      data: {
        tenantId: tenantAId,
        customerId: customer.id,
        imeiUnitId: imeiUnit.id,
        planId: plan.id,
        principal: new Prisma.Decimal('12000.00'),
        downPayment: new Prisma.Decimal('2000.00'),
        termMonths: 6,
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        status: 'APPROVED',
      },
    });

    const created = await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(created.body.data.status).toBe('DRAFT');
    expect(created.body.data.applicationId).toBe(application.id);
    expect(created.body.data.version.version).toBe(1);
    expect(Array.isArray(created.body.data.scheduleItems)).toBe(true);
    expect(created.body.data.scheduleItems.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/contracts`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(409);

    const contractId = created.body.data.id as string;

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
    expect(fetched.body.data.scheduleItems.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });
});
