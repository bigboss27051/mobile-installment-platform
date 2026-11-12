# Project Status

**Updated:** 2026-11-12  
**Current Phase:** R1e — Payment Verify + Allocate (**next**); R1d Contract + Schedule — **complete**  
**Branch:** `develop`  
**Codebase:** NestJS backend with R0 foundation + R1a inventory + R1b customer/KYC + R1c application/scorecard + R1d contract/schedule on `develop`; CI on push/PR

## Summary

R0 foundation plus **R1a inventory**, **R1b customer/KYC**, **R1c application/scorecard**, and **R1d contract/schedule** slices are delivered on `develop`: Product → Variant → ImeiUnit inventory flows, customer profile + consent capture, KYC case/document handling, application DRAFT + submit/decision flows, advisory scorecards, contract DRAFT create/list/get from APPROVED applications, `r1d-v1` flat/reducing schedule generation, and DRAFT activate/cancel with IMEI state invariants under JWT tenant scope. Backend tests are now approximately **18** unit suites (**152** tests) and **6** e2e suites (**8** tests, including cross-tenant isolation paths). **Phase 3 full RBAC is not complete** — baseline owner auth and tenant-scoped routes only.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-029 (`DECISION-LOG.md`)
- R0 plan execution (Tasks 1–7): infrastructure, backend shell, Prisma, isolation, auth, tests, CI
- R1a inventory plan execution (Tasks 1–7): schema, catalog, receive/transfer/reserve/release, HTTP, e2e, status docs
- R1b customer/KYC plan execution (Tasks 1–7): schema, encrypted national ID storage, customer + KYC APIs, OCR sandbox port, staff review audit, e2e isolation, status docs
- R1c application/scorecard plan execution (Tasks 1–8): app + scorecard schema, seeded plan list (read-only), application draft/submit/decision APIs, scorecard `r1c-v1`, decision/cancel IMEI release rules, e2e isolation, exit docs
- R1d contract/schedule plan execution (Tasks 1–6): contract + schedule schema, `r1d-v1` schedule engine tests, contract draft create/list/get APIs, activate/cancel atomic IMEI behavior, e2e tenant isolation, exit docs
- `.github/workflows/ci.yml` for backend pipeline

## In Progress

- Nothing active; **R1e Payment Verify + Allocate** is the next gated slice (spec/plan first)

## Follow-ups (R0 / early Phase 3)

- Full RBAC permission matrix and branch-scoped staff rules
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- R1e Payment Verify + Allocate, then R1f per release plan
- Production OCR vendor integration (BLOCKED on credentials/proof)
- Client apps and device/payment integrations (BLOCKED on credentials/hardware)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md` — R1e scope
2. Draft R1e spec/plan in `docs/superpowers/` when approved to proceed
3. `docs/superpowers/plans/2026-11-12-r1d-contract-schedule.md` — R1d implementation reference

## Do Not

- Scaffold all apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim Merchant Web/Flutter UI delivered in backend-only slices
- Claim Plan CRUD, e-sign, or payment posting complete outside their gated slices
- Claim production OCR integration complete without real credentials/evidence
