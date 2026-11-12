# Current Phase: Phase 1–2 / R0 — Foundation

**Previous:** Phase 0 Product Discovery — **APPROVED** 2026-11-12

**R0 foundation scaffold:** **COMPLETE** (2026-11-12) — Compose, NestJS health/validation, Prisma tenant tables, tenant isolation (unit + e2e), owner auth (register/login/refresh), GitHub Actions CI. **Not** full Phase 3 RBAC or production integrations.

## Scope

Lock implementation-ready architecture details, then scaffold monorepo foundation: NestJS backend, Prisma/Postgres, Redis, Docker Compose, health checks, CI skeleton, and baseline auth/tenant schema (no full installment domain yet).

## Tasks

See `docs/superpowers/plans/2026-11-12-r0-foundation.md`

## R0 follow-ups (not done)

- Full RBAC permission matrix (Phase 3 continuation)
- Swagger / OpenAPI polish on all public endpoints
- BullMQ workers wired to Redis (queues stubbed only if present)
- Inventory, KYC, installment domain modules
- Admin web, Flutter apps, Android DPC, live payment adapters

## Dependencies

- Stakeholder answers on funding, market, device policy, interest, pilot ambition, credit flow — received

## Expected Files

See master plan Phase 0 deliverables + PM + API standards + design spec path.

## Acceptance Criteria

- Docs reviewable without code
- Assumptions/risks explicit
- Release slices defined
- No false claims of working integrations

## Risks

- Full-stack ambition may pressure skipping gates → mitigated by R0–R3
- Legal review of device enforcement not yet done → Risk R-001

## Next Phase (after approval)

**Phase 1: System Architecture** solidification (refine drafts into implementation-ready architecture) then continued **Phase 2/3** foundation (RBAC matrix, API standards enforcement, async jobs).
