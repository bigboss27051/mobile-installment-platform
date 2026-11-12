# Project Status

**Updated:** 2026-11-12  
**Current Phase:** R1f — Merchant Web + Customer Android critical paths (**next**); R1e Payment Verify + Allocate — **complete**  
**Branch:** `develop`  
**Codebase:** NestJS backend with R0 foundation + R1a inventory + R1b customer/KYC + R1c application/scorecard + R1d contract/schedule + R1e payment verify/allocate on `develop`; CI on push/PR

## Summary

R0 foundation plus **R1a–R1e** backend slices are delivered on `develop`. R1e adds staff-created idempotent PromptPay sandbox payment intents, HMAC-verified webhooks, FIFO multi-installment allocation, and simple installment ledger postings on ACTIVE contracts under JWT tenant scope. Backend tests are approximately **22** unit suites (**188** tests) and **7** e2e suites (**9** tests, including payment idempotency and cross-tenant isolation). **Phase 3 full RBAC is not complete** — baseline owner auth and tenant-scoped routes only. Omise live adapter, refunds, and UI apps are not claimed complete.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-035 (`DECISION-LOG.md`)
- R0 plan execution (Tasks 1–7): infrastructure, backend shell, Prisma, isolation, auth, tests, CI
- R1a inventory plan execution (Tasks 1–7): schema, catalog, receive/transfer/reserve/release, HTTP, e2e, status docs
- R1b customer/KYC plan execution (Tasks 1–7): schema, encrypted national ID storage, customer + KYC APIs, OCR sandbox port, staff review audit, e2e isolation, status docs
- R1c application/scorecard plan execution (Tasks 1–8): app + scorecard schema, seeded plan list (read-only), application draft/submit/decision APIs, scorecard `r1c-v1`, decision/cancel IMEI release rules, e2e isolation, exit docs
- R1d contract/schedule plan execution (Tasks 1–6): contract + schedule schema, `r1d-v1` schedule engine tests, contract draft create/list/get APIs, activate/cancel atomic IMEI behavior, e2e tenant isolation, exit docs
- R1e payment verify/allocate plan execution (Tasks 1–7): payment schema + `amountPaid`/PARTIAL/PAID, FIFO allocate helper, sandbox `PaymentGatewayPort` + HMAC, staff idempotent intent create/get, webhook allocate + ledger with schedule row locks, e2e isolation/idempotency, exit docs
- `.github/workflows/ci.yml` for backend pipeline

## In Progress

- Nothing active; **R1f Merchant Web + Customer Android critical paths** is the next gated slice (brainstorm/spec/plan first)

## Follow-ups (R0 / early Phase 3)

- Full RBAC permission matrix and branch-scoped staff rules
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- R1f client critical paths per release plan
- Production Omise/Opn adapter (BLOCKED on credentials)
- Production OCR vendor integration (BLOCKED on credentials/proof)
- Device/MDM integrations (BLOCKED on hardware/proof)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md` — R1f scope
2. Brainstorm → design spec → plan for R1f in `docs/superpowers/` when approved to proceed
3. `docs/superpowers/plans/2026-11-12-r1e-payment-allocate.md` — R1e implementation reference

## Do Not

- Scaffold all apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim Merchant Web/Flutter UI delivered in backend-only slices
- Claim live Omise, refunds, or device unlock from payment webhooks
- Claim production OCR integration complete without real credentials/evidence
