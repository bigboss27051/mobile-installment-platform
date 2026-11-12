import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Inventory (e2e)', () => {
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

  it('enforces tenant inventory isolation and supports happy stock flow', async () => {
    const now = Date.now();

    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Inventory Tenant A ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `inv-owner-a-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Inventory Owner A',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Inventory Tenant B ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `inv-owner-b-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Inventory Owner B',
      })
      .expect(201);
    trackRegistration(regB.body);

    const tokenA = regA.body.data.accessToken as string;
    const tokenB = regB.body.data.accessToken as string;
    const tenantAId = regA.body.data.user.tenantId as string;
    const branchAId = await resolveBranchIdForTenant(tenantAId);
    const branchB2 = await prisma.branch.create({
      data: { tenantId: tenantAId, code: 'B2', name: 'Branch 2' },
      select: { id: true },
    });
    const branchB2Id = branchB2.id;

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Galaxy S24',
        brand: 'Samsung',
      })
      .expect(201);
    const productId = product.body.data.id as string;

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sku: `SKU-${now}`,
        color: 'Black',
        storage: '256GB',
        price: '28990.00',
      })
      .expect(201);
    const variantId = variant.body.data.id as string;

    const imei = `359${String(now).slice(-12)}`;
    const receive = await request(app.getHttpServer())
      .post('/api/v1/inventory/imeis/receive')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branchId: branchAId,
        variantId,
        imei,
        reason: 'Initial stock receive',
      })
      .expect(201);
    const imeiUnitId = receive.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const transfer = await request(app.getHttpServer())
      .post(`/api/v1/inventory/imeis/${imeiUnitId}/transfer`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        toBranchId: branchB2Id,
        reason: 'Cycle-count transfer',
      })
      .expect(201);
    expect(transfer.body.data.branchId).toBe(branchB2Id);
    expect(transfer.body.data.branchId).not.toBe(branchAId);
    expect(transfer.body.data.status).toBe('AVAILABLE');

    const reserve = await request(app.getHttpServer())
      .post(`/api/v1/inventory/imeis/${imeiUnitId}/reserve`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Reserve for customer' })
      .expect(201);
    expect(reserve.body.data.status).toBe('RESERVED');

    const release = await request(app.getHttpServer())
      .post(`/api/v1/inventory/imeis/${imeiUnitId}/release`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Reservation timeout' })
      .expect(201);
    expect(release.body.data.status).toBe('AVAILABLE');

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/inventory/imeis/${imeiUnitId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(fetched.body.data.status).toBe('AVAILABLE');
    expect(fetched.body.data.variant.id).toBe(variantId);
    expect(fetched.body.data.variant.price).toBe('28990.00');
  });

  it('returns 400 for invalid inventory query and route UUIDs', async () => {
    const now = Date.now();

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: `Inventory Validation Tenant ${now}`,
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `inv-validation-${now}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Inventory Validation Owner',
      })
      .expect(201);
    trackRegistration(reg.body);

    const token = reg.body.data.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/v1/inventory/imeis?status=NOT_A_STATUS')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/inventory/imeis?branchId=not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/inventory/movements?imeiUnitId=bad-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/products/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
