# Project Status

**Updated:** 2026-11-12  
**Current Phase:** R1b — Customer + KYC (**next**); R1a Inventory + IMEI — **complete**  
**Branch:** `develop`  
**Codebase:** NestJS backend with R0 foundation + R1a catalog/inventory on `develop`; CI on push/PR

## Summary

R0 foundation and the **R1a inventory slice** are delivered on `develop`: Product → Variant → ImeiUnit, branch-bound stock, movements, reserve/release, and REST APIs under JWT tenant scope. Backend tests: **8** unit suites (**46** tests) and **3** e2e suites (**4** tests, including inventory isolation and stock flow) passing locally. **Phase 3 full RBAC is not complete** — baseline owner auth and tenant-scoped routes only.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-017 (`DECISION-LOG.md`)
- R0 plan execution (Tasks 1–7): infrastructure, backend shell, Prisma, isolation, auth, tests, CI
- R1a inventory plan execution (Tasks 1–7): schema, catalog, receive/transfer/reserve/release, HTTP, e2e, status docs
- `.github/workflows/ci.yml` for backend pipeline

## In Progress

- Nothing active; **R1b** is the next gated slice (spec/plan first)

## Follow-ups (R0 / early Phase 3)

- Full RBAC permission matrix and branch-scoped staff rules
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- R1b Customer + KYC, then R1c–R1f per release plan
- Client apps and device/payment integrations (BLOCKED on credentials/hardware)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md` — R1b scope
2. Draft R1b spec/plan in `docs/superpowers/` when approved to proceed
3. `docs/superpowers/plans/2026-11-12-r1a-inventory-imei.md` — R1a exit checklist (reference)

## Do Not

- Scaffold all apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim Merchant Web inventory UI done (deferred to R1f; D-016)
