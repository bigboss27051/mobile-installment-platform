# Mobile Installment SaaS Platform

Multi-tenant installment management platform for mobile phone retailers in **Thailand**.

**Business model:** Merchants self-fund customer receivables; this platform provides operations software (KYC, contracts, payments, collections, optional device management).

## Current status

**Phase 0 — Product Discovery** (documentation). Application code is not scaffolded yet.

Start here:

1. [docs/roadmap/CURRENT-PHASE.md](docs/roadmap/CURRENT-PHASE.md)
2. [docs/product/PRD.md](docs/product/PRD.md)
3. [docs/product/PRODUCT-SCOPE.md](docs/product/PRODUCT-SCOPE.md)
4. [docs/project-management/DECISION-LOG.md](docs/project-management/DECISION-LOG.md)
5. [docs/superpowers/specs/2026-11-12-phase-0-product-discovery-design.md](docs/superpowers/specs/2026-11-12-phase-0-product-discovery-design.md)

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

## Phase gate

Do not start Phase 1 implementation scaffolding until Phase 0 acceptance is approved. See [docs/product/ACCEPTANCE-CRITERIA.md](docs/product/ACCEPTANCE-CRITERIA.md).
