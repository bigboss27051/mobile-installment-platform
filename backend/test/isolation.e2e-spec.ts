import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tenant isolation (e2e)', () => {
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
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
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

  it('GET /tenants/me without Authorization returns 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/tenants/me').expect(401);
  });

  it('GET /tenants/me returns caller tenant from JWT (not another tenant)', async () => {
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: 'Tenant A',
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `owner-a-${Date.now()}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Owner A',
      })
      .expect(201);
    trackRegistration(regA.body);

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register-owner')
      .send({
        tenantName: 'Tenant B',
        branchCode: 'HQ',
        branchName: 'HQ',
        ownerEmail: `owner-b-${Date.now()}@test.local`,
        ownerPassword: 'Password1!',
        ownerFullName: 'Owner B',
      })
      .expect(201);
    trackRegistration(regB.body);

    const tokenA = regA.body.data.accessToken as string;
    const tenantBId = regB.body.data.user.tenantId as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/tenants/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(me.body.data.id).toEqual(regA.body.data.user.tenantId);
    expect(me.body.data.id).not.toEqual(tenantBId);
  });
});
