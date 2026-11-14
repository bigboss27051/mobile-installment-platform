# Mobile Installment SaaS Platform

Multi-tenant installment management platform for mobile phone retailers in **Thailand**.

**Business model:** Merchants self-fund customer receivables; this platform provides operations software (KYC, contracts, payments, collections, optional device management).

## Current status

**R1 installment core** on `develop`: NestJS backend (R0–R1e) plus R1f Merchant Web and Customer Android critical paths. Live payments/MDM remain BLOCKED. Next planning gate: **DM0** device enrollment feasibility.

Start here:

1. [docs/roadmap/CURRENT-PHASE.md](docs/roadmap/CURRENT-PHASE.md)
2. [docs/project-management/MASTER-EXECUTION-PLAN.md](docs/project-management/MASTER-EXECUTION-PLAN.md)
3. [docs/project-management/PROJECT-STATUS.md](docs/project-management/PROJECT-STATUS.md)
4. [docs/product/PRD.md](docs/product/PRD.md)
5. [docs/project-management/DECISION-LOG.md](docs/project-management/DECISION-LOG.md)
6. [docs/device-management/README.md](docs/device-management/README.md) (R2 enrollment)

Merchant Web (Vite): `pnpm --filter @mip/merchant-web dev` (proxies `/api` to port 3000).  
Customer Android: `apps/customer-mobile` (`flutter run`; sandbox OTP `123456`).

## Planned monorepo layout

```text
apps/          super-admin, merchant-web, merchant-mobile, customer-mobile, android-dpc
backend/       NestJS + Prisma
packages/      api-contracts, shared-types, documentation
infrastructure/ docker, postgres, redis, monitoring
docs/          product, architecture, database, ...
```

## Stack (target)

NestJS · PostgreSQL · Prisma · Redis · BullMQ · React admin apps · Flutter mobile · Kotlin DPC · Docker · GitHub Actions

## Local development (R0)

Postgres is published on **host port 5433** (container internal 5432) to avoid conflicts with a local Postgres on 5432. Set `DATABASE_URL` in `.env` to use port **5433** — see `.env.example`.

```bash
cp .env.example .env
docker compose up -d
docker compose ps   # postgres should be healthy on 5433, redis on 6379
corepack enable
pnpm install
pnpm --filter @mip/backend exec prisma migrate dev
pnpm --filter @mip/backend start:dev
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

Optional: run tests locally (requires Compose up and `.env` / env vars for JWT secrets):

```bash
pnpm --filter @mip/backend test
pnpm --filter @mip/backend test:e2e
```

## CI

On push/PR to `develop` or `main`, GitHub Actions runs migrate deploy, typecheck, unit tests, and e2e against service containers (Postgres on **5432 inside the runner**, Redis on 6379). See `.github/workflows/ci.yml`.
