# R0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a runnable multi-tenant foundation: Dockerized Postgres/Redis, NestJS API with health + auth + tenant-scoped user bootstrap, Prisma schema, isolation tests, and CI lint/test.

**Architecture:** Modular NestJS monolith under `backend/` with Prisma against PostgreSQL, Redis reserved for later queues, JWT access/refresh auth, and `TenantContext` derived from the authenticated user (never from client `tenantId` body). R0 does not implement installment, payment, or device domains.

**Tech Stack:** Node 20+, NestJS 10, TypeScript strict, Prisma 5/6, PostgreSQL 16, Redis 7, Jest, Docker Compose, GitHub Actions, pnpm workspaces (or npm workspaces if pnpm unavailable — prefer pnpm).

## Global Constraints

- Thailand pilot; merchant self-funded model (no lending ledger in R0)
- TypeScript strict; ESLint + Prettier; semicolons required
- UUID primary keys; `tenant_id` on all tenant business tables
- Never trust client-supplied `tenantId` for authorization
- No float for money (money tables deferred past R0)
- No production secrets in git; use `.env.example`
- Do not scaffold Flutter/DPC/full admin apps in this plan
- Frequent commits per task; do not skip tests

## File Structure (R0)

```text
package.json                          # workspace root
pnpm-workspace.yaml
.gitignore
docker-compose.yml
.env.example                          # already exists — extend
.github/workflows/ci.yml
backend/
  package.json
  nest-cli.json
  tsconfig.json
  tsconfig.build.json
  prisma/schema.prisma
  prisma/migrations/...
  src/
    main.ts
    app.module.ts
    config/env.validation.ts
    common/
      filters/http-exception.filter.ts
      interceptors/logging.interceptor.ts
      tenant/tenant-context.ts
      tenant/tenant.decorator.ts
    prisma/prisma.module.ts
    prisma/prisma.service.ts
    health/health.module.ts
    health/health.controller.ts
    health/health.controller.spec.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.service.spec.ts
      dto/login.dto.ts
      dto/register-owner.dto.ts
      strategies/jwt.strategy.ts
      guards/jwt-auth.guard.ts
    tenants/
      tenants.module.ts
      tenants.service.ts
      tenants.service.spec.ts
  test/
    isolation.e2e-spec.ts
    jest-e2e.json
packages/
  shared-types/package.json
  shared-types/src/index.ts
```

---

### Task 1: Root workspace, ignore rules, Compose infra

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `infrastructure/postgres/init.sql`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: none
- Produces: Compose services `postgres` (5432) and `redis` (6379); env keys `DATABASE_URL`, `REDIS_URL`

- [ ] **Step 1: Create root workspace files**

`package.json`:

```json
{
  "name": "mobile-installment-platform",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev:backend": "pnpm --filter @mip/backend start:dev",
    "test:backend": "pnpm --filter @mip/backend test",
    "test:backend:e2e": "pnpm --filter @mip/backend test:e2e",
    "lint:backend": "pnpm --filter @mip/backend lint",
    "typecheck:backend": "pnpm --filter @mip/backend typecheck"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "backend"
  - "packages/*"
```

`.gitignore`:

```text
node_modules
dist
coverage
.env
.env.local
*.log
.DS_Store
backend/prisma/*.db
.turbo
```

- [ ] **Step 2: Create Docker Compose + Postgres init**

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mip-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mobile_installment
    ports:
      - "5432:5432"
    volumes:
      - mip_pg_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d mobile_installment"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: mip-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  mip_pg_data:
```

`infrastructure/postgres/init.sql`:

```sql
-- Reserved for extensions; UUID generated in app via Prisma @default(uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

- [ ] **Step 3: Extend `.env.example`**

Replace contents with:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mobile_installment?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

Copy to local `.env` (do not commit `.env`):

```bash
cp .env.example .env
```

- [ ] **Step 4: Start infrastructure and verify health**

```bash
docker compose up -d
docker compose ps
```

Expected: `mip-postgres` and `mip-redis` healthy/up.

```bash
docker exec mip-postgres pg_isready -U postgres -d mobile_installment
docker exec mip-redis redis-cli ping
```

Expected: `accepting connections` and `PONG`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore docker-compose.yml infrastructure/postgres/init.sql .env.example README.md
git commit -m "$(cat <<'EOF'
chore: add workspace root and local Postgres/Redis compose

EOF
)"
```

---

### Task 2: Shared types package + NestJS backend skeleton with health

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/tsconfig.json`
- Create: entire `backend/` Nest app (via CLI then trim)
- Create: `backend/src/health/health.controller.ts`
- Create: `backend/src/health/health.controller.spec.ts`
- Create: `backend/src/health/health.module.ts`
- Create: `backend/src/config/env.validation.ts`
- Create: `backend/src/common/filters/http-exception.filter.ts`

**Interfaces:**
- Consumes: env from Task 1
- Produces: `GET /api/v1/health` → `{ data: { status: "ok" } }`; Nest app boots on `PORT`

- [ ] **Step 1: Create shared-types package**

`packages/shared-types/package.json`:

```json
{
  "name": "@mip/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

`packages/shared-types/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "declaration": true,
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

`packages/shared-types/src/index.ts`:

```typescript
export type Uuid = string;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
}

export interface ApiData<T> {
  data: T;
}
```

- [ ] **Step 2: Scaffold NestJS backend**

```bash
pnpm dlx @nestjs/cli@10 new backend --package-manager pnpm --skip-git --strict
```

Then set `backend/package.json` name to `@mip/backend` and add scripts:

```json
{
  "name": "@mip/backend",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "typecheck": "tsc -p tsconfig.build.json --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev"
  }
}
```

Install deps from repo root:

```bash
pnpm install
pnpm --filter @mip/backend add @nestjs/config class-validator class-transformer joi bcrypt uuid
pnpm --filter @mip/backend add -D @types/bcrypt @types/uuid
```

- [ ] **Step 3: Write failing health controller test**

`backend/src/health/health.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status envelope', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toEqual({ data: { status: 'ok' } });
  });
});
```

`backend/src/health/health.controller.ts` — create empty class first if needed so the import resolves, or write test then minimal controller in next step.

- [ ] **Step 4: Run unit test to verify it fails or is red before full impl**

```bash
pnpm --filter @mip/backend test -- health.controller.spec.ts
```

Expected: FAIL until controller implements `check()`.

- [ ] **Step 5: Implement health module + wire AppModule + main**

`backend/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { data: { status: 'ok' } } {
    return { data: { status: 'ok' } };
  }
}
```

`backend/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

`backend/src/config/env.validation.ts`:

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
});
```

`backend/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] } | null)
            ?.message ?? 'Internal server error');

    response.status(status).json({
      error: {
        code:
          status === 401
            ? 'UNAUTHORIZED'
            : status === 403
              ? 'FORBIDDEN'
              : status === 404
                ? 'NOT_FOUND'
                : status === 400
                  ? 'BAD_REQUEST'
                  : 'INTERNAL_ERROR',
        message: Array.isArray(message) ? message.join(', ') : message,
        details: [],
        requestId,
      },
    });
  }
}
```

`backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    HealthModule,
  ],
})
export class AppModule {}
```

`backend/src/main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 6: Run unit test and hit health endpoint**

```bash
pnpm --filter @mip/backend test -- health.controller.spec.ts
pnpm --filter @mip/backend start:dev
```

In another shell:

```bash
curl -s http://localhost:3000/api/v1/health
```

Expected JSON: `{"data":{"status":"ok"}}`

- [ ] **Step 7: Commit**

```bash
git add packages/shared-types backend
git commit -m "$(cat <<'EOF'
feat: scaffold NestJS backend with versioned health endpoint

EOF
)"
```

---

### Task 3: Prisma schema for Tenant, Branch, User, RefreshToken

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: migration via Prisma CLI
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `DATABASE_URL`
- Produces: Prisma models `Tenant`, `Branch`, `User`, `RefreshToken`; `PrismaService`

- [ ] **Step 1: Install Prisma**

```bash
pnpm --filter @mip/backend add @prisma/client
pnpm --filter @mip/backend add -D prisma
pnpm --filter @mip/backend exec prisma init
```

- [ ] **Step 2: Write schema**

`backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum PlatformRole {
  SUPER_ADMIN
  MERCHANT_OWNER
  MERCHANT_STAFF
}

model Tenant {
  id        String       @id @default(uuid()) @db.Uuid
  name      String
  status    TenantStatus @default(PENDING)
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")
  branches  Branch[]
  users     User[]

  @@map("tenants")
}

model Branch {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  code      String
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("branches")
}

model User {
  id           String       @id @default(uuid()) @db.Uuid
  tenantId     String?      @map("tenant_id") @db.Uuid
  email        String       @unique
  passwordHash String       @map("password_hash")
  fullName     String       @map("full_name")
  role         PlatformRole @default(MERCHANT_STAFF)
  status       UserStatus   @default(ACTIVE)
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  tenant       Tenant?      @relation(fields: [tenantId], references: [id])
  refreshTokens RefreshToken[]

  @@index([tenantId])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tokenHash String   @map("token_hash")
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("refresh_tokens")
}
```

- [ ] **Step 3: Migrate**

```bash
# ensure DATABASE_URL is available to backend (symlink or export)
export $(grep -v '^#' .env | xargs)
pnpm --filter @mip/backend exec prisma migrate dev --name r0_init_tenant_user
pnpm --filter @mip/backend exec prisma generate
```

Expected: migration applied; client generated.

- [ ] **Step 4: Prisma module**

`backend/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

`backend/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Import `PrismaModule` in `AppModule`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/prisma backend/src/app.module.ts backend/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat: add Prisma tenant/branch/user schema and migration

EOF
)"
```

---

### Task 4: Tenant service + cross-tenant isolation unit tests

**Files:**
- Create: `backend/src/common/tenant/tenant-context.ts`
- Create: `backend/src/tenants/tenants.module.ts`
- Create: `backend/src/tenants/tenants.service.ts`
- Create: `backend/src/tenants/tenants.service.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces:
  - `TenantContext` type `{ tenantId: string; userId: string; role: PlatformRole }`
  - `TenantsService.createTenantWithOwner(input): Promise<{ tenantId: string; userId: string; branchId: string }>`
  - `TenantsService.getTenantByIdForContext(tenantId: string, ctx: TenantContext)` throws if `ctx.tenantId !== tenantId` (unless `SUPER_ADMIN`)

- [ ] **Step 1: Write failing isolation tests**

`backend/src/common/tenant/tenant-context.ts`:

```typescript
import { PlatformRole } from '@prisma/client';

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: PlatformRole;
}
```

`backend/src/tenants/tenants.service.spec.ts`:

```typescript
import { ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { TenantsService } from './tenants.service';

describe('TenantsService isolation', () => {
  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const service = new TenantsService(prisma as never);

  it('denies reading another tenant for merchant owner', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-b',
      name: 'B',
    });

    await expect(
      service.getTenantByIdForContext('tenant-b', {
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows reading own tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-a',
      name: 'A',
    });

    await expect(
      service.getTenantByIdForContext('tenant-a', {
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).resolves.toEqual({ id: 'tenant-a', name: 'A' });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (service missing)**

```bash
pnpm --filter @mip/backend test -- tenants.service.spec.ts
```

Expected: FAIL cannot find module or methods.

- [ ] **Step 3: Implement TenantsService**

`backend/src/tenants/tenants.service.ts`:

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant-context';

export interface CreateTenantWithOwnerInput {
  tenantName: string;
  branchCode: string;
  branchName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenantWithOwner(
    input: CreateTenantWithOwnerInput,
  ): Promise<{ tenantId: string; userId: string; branchId: string }> {
    const passwordHash = await bcrypt.hash(input.ownerPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          status: TenantStatus.ACTIVE,
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          code: input.branchCode,
          name: input.branchName,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail.toLowerCase(),
          passwordHash,
          fullName: input.ownerFullName,
          role: PlatformRole.MERCHANT_OWNER,
        },
      });

      return {
        tenantId: tenant.id,
        userId: user.id,
        branchId: branch.id,
      };
    });
  }

  async getTenantByIdForContext(
    tenantId: string,
    ctx: TenantContext,
  ): Promise<{ id: string; name: string }> {
    if (
      ctx.role !== PlatformRole.SUPER_ADMIN &&
      ctx.tenantId !== tenantId
    ) {
      throw new ForbiddenException('You cannot access this resource.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }
}
```

`backend/src/tenants/tenants.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Module({
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

Import `TenantsModule` in `AppModule`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @mip/backend test -- tenants.service.spec.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/tenants backend/src/common/tenant backend/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat: add tenant bootstrap service with isolation guards

EOF
)"
```

---

### Task 5: Auth register-owner + login + JWT

**Files:**
- Create: `backend/src/auth/**`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `TenantsService`, `PrismaService`, JWT secrets
- Produces:
  - `POST /api/v1/auth/register-owner`
  - `POST /api/v1/auth/login` → `{ data: { accessToken, refreshToken, user } }`
  - `POST /api/v1/auth/refresh`
  - JWT payload `{ sub: userId, tenantId, role }`

- [ ] **Step 1: Install auth packages**

```bash
pnpm --filter @mip/backend add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm --filter @mip/backend add -D @types/passport-jwt
```

- [ ] **Step 2: Write failing auth service test for login rejection**

`backend/src/auth/auth.service.spec.ts`:

```typescript
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('rejects invalid password', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.com',
          passwordHash: 'not-a-real-hash',
          tenantId: 't1',
          role: 'MERCHANT_OWNER',
          status: 'ACTIVE',
          fullName: 'A',
        }),
      },
    };
    const jwt = { signAsync: jest.fn() };
    const tenants = {};
    const config = {
      get: (key: string) =>
        key.includes('TTL') ? '15m' : 'dev-access-secret-change-me',
    };

    const service = new AuthService(
      prisma as never,
      jwt as never,
      tenants as never,
      config as never,
    );

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL/red**

```bash
pnpm --filter @mip/backend test -- auth.service.spec.ts
```

- [ ] **Step 4: Implement DTOs, AuthService, controller, module**

`backend/src/auth/dto/register-owner.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @IsString()
  @MinLength(2)
  tenantName!: string;

  @IsString()
  @MinLength(2)
  branchCode!: string;

  @IsString()
  @MinLength(2)
  branchName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @IsString()
  @MinLength(2)
  ownerFullName!: string;
}
```

`backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

`backend/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tenants: TenantsService,
    private readonly config: ConfigService,
  ) {}

  async registerOwner(dto: RegisterOwnerDto) {
    const created = await this.tenants.createTenantWithOwner({
      tenantName: dto.tenantName,
      branchCode: dto.branchCode,
      branchName: dto.branchName,
      ownerEmail: dto.ownerEmail,
      ownerPassword: dto.ownerPassword,
      ownerFullName: dto.ownerFullName,
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: created.userId },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  private async issueTokens(user: {
    id: string;
    tenantId: string | null;
    role: string;
    email: string;
    fullName: string;
  }) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });

    const refreshToken = randomUUID() + randomUUID();
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const ttl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const expiresAt = new Date(Date.now() + parseTtlMs(ttl));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tenantId: user.tenantId,
          role: user.role,
        },
      },
    };
  }
}

function parseTtlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
```

`backend/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PlatformRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: PlatformRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): {
    userId: string;
    tenantId: string | null;
    role: PlatformRole;
  } {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
```

`backend/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';

class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register-owner')
  registerOwner(@Body() dto: RegisterOwnerDto) {
    return this.auth.registerOwner(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
```

`backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TenantsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

Wire `AuthModule` into `AppModule`.

- [ ] **Step 5: Fix auth unit test hash**

Update the invalid-password test to use a real bcrypt hash of `correct-password` so `bcrypt.compare` runs, still expecting Unauthorized for `wrong`.

```typescript
import * as bcrypt from 'bcrypt';
// in test setup:
passwordHash: await bcrypt.hash('correct-password', 4),
```

- [ ] **Step 6: Run unit tests**

```bash
pnpm --filter @mip/backend test
```

Expected: all unit tests PASS.

- [ ] **Step 7: Manual smoke (optional in same task)**

```bash
pnpm --filter @mip/backend start:dev
curl -s -X POST http://localhost:3000/api/v1/auth/register-owner \
  -H 'content-type: application/json' \
  -d '{"tenantName":"Shop A","branchCode":"HQ","branchName":"Headquarters","ownerEmail":"owner@shop-a.test","ownerPassword":"Password1!","ownerFullName":"Owner A"}'
```

Expected: `data.accessToken` present.

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts backend/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat: add owner registration, login, and refresh token auth

EOF
)"
```

---

### Task 6: Protected tenant me endpoint + e2e isolation test

**Files:**
- Create: `backend/src/tenants/tenants.controller.ts`
- Create: `backend/src/common/tenant/current-user.decorator.ts`
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/isolation.e2e-spec.ts`
- Modify: `backend/src/tenants/tenants.module.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`, `TenantsService.getTenantByIdForContext`
- Produces: `GET /api/v1/tenants/me` returns caller tenant; cross-tenant forge attempts denied

- [ ] **Step 1: Add decorator + controller**

`backend/src/common/tenant/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenant-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<{ user: TenantContext }>();
    return request.user;
  },
);
```

Align JwtStrategy return with `TenantContext` field names (`userId`, `tenantId`, `role`) — already matches.

`backend/src/tenants/tenants.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: TenantContext) {
    if (!user.tenantId) {
      return { data: null };
    }
    const tenant = await this.tenants.getTenantByIdForContext(
      user.tenantId,
      user,
    );
    return { data: tenant };
  }
}
```

Register controller in `TenantsModule`.

- [ ] **Step 2: Write e2e isolation test**

`backend/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

`backend/test/isolation.e2e-spec.ts`:

```typescript
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
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.tenant.deleteMany();
    await app.close();
  });

  it('tenant A token cannot read tenant B via forged path semantics on /tenants/me', async () => {
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

    const tokenA = regA.body.data.accessToken as string;
    const tenantBId = regB.body.data.user.tenantId as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/tenants/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(me.body.data.id).not.toEqual(tenantBId);
    expect(me.body.data.id).toEqual(regA.body.data.user.tenantId);
  });
});
```

Note: Nest default POST success may be 201 only if `@HttpCode` or `@Post` with created — if register returns 200, adjust `.expect(200)`.

- [ ] **Step 3: Install supertest if missing and run e2e**

```bash
pnpm --filter @mip/backend add -D supertest @types/supertest
pnpm --filter @mip/backend test:e2e
```

Expected: PASS.

If register returns 200, change expects to 200.

- [ ] **Step 4: Commit**

```bash
git add backend/src/tenants backend/src/common/tenant backend/test
git commit -m "$(cat <<'EOF'
test: add tenant me endpoint and isolation e2e coverage

EOF
)"
```

---

### Task 7: GitHub Actions CI + README runbook

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`

**Interfaces:**
- Consumes: backend lint/typecheck/test scripts
- Produces: CI workflow on pull_request/push

- [ ] **Step 1: Add CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: ci

on:
  push:
    branches: [develop, main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mobile_installment
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d mobile_installment"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mobile_installment?schema=public
      REDIS_URL: redis://localhost:6379
      JWT_ACCESS_SECRET: ci-access-secret-change-me
      JWT_REFRESH_SECRET: ci-refresh-secret-change-me
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mip/backend exec prisma migrate deploy
      - run: pnpm --filter @mip/backend typecheck
      - run: pnpm --filter @mip/backend test
      - run: pnpm --filter @mip/backend test:e2e
```

- [ ] **Step 2: Update README with local run steps**

Add section:

```markdown
## Local development (R0)

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @mip/backend exec prisma migrate dev
pnpm --filter @mip/backend start:dev
curl http://localhost:3000/api/v1/health
```
```

- [ ] **Step 3: Mark R0 foundation tasks complete in status docs**

Update `PROJECT-STATUS.md` and `CURRENT-PHASE.md` to note foundation scaffold complete when all prior tasks done; list remaining R0 gaps (Swagger, BullMQ wire-up) as follow-ups — **do not claim full Phase 3 RBAC**.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md docs/roadmap/CURRENT-PHASE.md docs/project-management/PROJECT-STATUS.md
git commit -m "$(cat <<'EOF'
ci: add backend GitHub Actions pipeline and local runbook

EOF
)"
```

---

## R0 Exit Criteria

- [ ] `docker compose up -d` healthy
- [ ] `GET /api/v1/health` returns ok
- [ ] Owner can register + login + refresh
- [ ] Unit isolation tests pass
- [ ] E2E isolation test passes
- [ ] CI workflow file present
- [ ] No Flutter/DPC/payment code claimed done

## Out of Scope (next plans)

- Full RBAC permission matrix (Phase 3 continuation)
- Swagger polish (can be tiny follow-up PR)
- BullMQ workers
- Inventory/KYC/Installment
- Admin web / Flutter / DPC

## Spec Coverage Self-Check

| Spec item | Task |
|-----------|------|
| Docker Postgres/Redis | Task 1 |
| NestJS + health + validation + errors | Task 2 |
| Prisma tenant tables | Task 3 |
| Tenant isolation | Task 4 + 6 |
| Auth register/login/refresh | Task 5 |
| CI | Task 7 |
| No full apps yet | Global constraint |

## Placeholder Scan

No TBD steps; vendor integrations intentionally deferred to later plans.
