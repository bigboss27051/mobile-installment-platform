# Project Status

**Updated:** 2026-11-12  
**Current Phase:** R1c — Application + Scorecard (**next**); R1b Customer + KYC — **complete**  
**Branch:** `develop`  
**Codebase:** NestJS backend with R0 foundation + R1a inventory + R1b customer/KYC on `develop`; CI on push/PR

## Summary

R0 foundation plus **R1a inventory** and **R1b customer/KYC** slices are delivered on `develop`: Product → Variant → ImeiUnit inventory flows, customer profile + consent capture, KYC case/document handling, OCR sandbox adapter, and staff review audit under JWT tenant scope. Backend tests are now approximately **12** unit suites (**88** tests) and **4** e2e suites (**6** tests, including cross-tenant isolation paths). **Phase 3 full RBAC is not complete** — baseline owner auth and tenant-scoped routes only.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-023 (`DECISION-LOG.md`)
- R0 plan execution (Tasks 1–7): infrastructure, backend shell, Prisma, isolation, auth, tests, CI
- R1a inventory plan execution (Tasks 1–7): schema, catalog, receive/transfer/reserve/release, HTTP, e2e, status docs
- R1b customer/KYC plan execution (Tasks 1–7): schema, encrypted national ID storage, customer + KYC APIs, OCR sandbox port, staff review audit, e2e isolation, status docs
- `.github/workflows/ci.yml` for backend pipeline

## In Progress

- Nothing active; **R1c** is the next gated slice (spec/plan first)

## Follow-ups (R0 / early Phase 3)

- Full RBAC permission matrix and branch-scoped staff rules
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- R1c Application + Scorecard, then R1d–R1f per release plan
- Production OCR vendor integration (BLOCKED on credentials/proof)
- Client apps and device/payment integrations (BLOCKED on credentials/hardware)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md` — R1c scope
2. Draft R1c spec/plan in `docs/superpowers/` when approved to proceed
3. `docs/superpowers/plans/2026-11-12-r1b-customer-kyc.md` — R1b exit checklist (reference)

## Do Not

- Scaffold all apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim Merchant Web/Flutter UI delivered in backend-only slices
- Claim production OCR integration complete without real credentials/evidence
