# Project Status

**Updated:** 2026-11-18  
**Current Phase:** R1f complete; R2 Phase 1 (shared enrollment foundation) done; Phase 2 custom DPC QR check-in code on `develop` (lab hardware NOT RUN). Next: one authorized lab device check-in (ask before any factory reset). Commercial Device Owner **BLOCKED**.  
**Branch:** `develop`  
**Codebase:** NestJS backend R0–R1e plus R1f customer OTP/`/me` portal, Merchant Web, Customer Android on `develop`; CI on push/PR

## Summary

R0 foundation plus **R1a–R1f** are delivered on `develop`. R1f adds tenant `slug`, sandbox customer OTP JWT (`typ=customer`), customer-scoped contract/payment APIs, Merchant Web critical ops, and Customer Android OTP/contract/QR pay. Staff sandbox payments from R1e remain. **Phase 3a RBAC** (permission codes + guard on decide/activate/enroll/bind/unbind) is in place; full role matrix + branch scope are not. Omise live adapter, SMS OTP, refunds, and MDM are not claimed complete.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-040 (`DECISION-LOG.md`)
- R0–R1e as previously recorded
- R1f: customer OTP sandbox auth, public tenant slug, `/me` contracts/intents, Merchant Web (Vite React), Customer Android (Flutter) critical paths, CI jobs for web + Flutter tests
- `.github/workflows/ci.yml` for backend + merchant-web + customer-android

## In Progress

- **Human:** Authorized Android lab device (ask before factory reset). ABM + MDM vendor still BLOCKED for iOS. AMAPI Google form is optional/historical, not the lock path.
- **Software next:** Phase 3 Android locking prototype is gated on a real Device Owner check-in from a lab device. Check-in unit tests cover replay idempotency, tenant-scoped device lookup, and CHECK_IN audit. No kiosk yet.

## Follow-ups (R0 / early Phase 3)

- Expand RBAC beyond Phase 3a (new roles from USER-ROLES.md, branch-scoped staff rules)
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- Production Omise/Opn adapter (BLOCKED on credentials)
- Production OCR vendor integration (BLOCKED on credentials/proof)
- SMS OTP adapter (BLOCKED)
- Device/MDM integrations (BLOCKED on hardware/proof)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md`  
2. `docs/project-management/MASTER-EXECUTION-PLAN.md`  
3. `docs/superpowers/plans/2026-11-14-phase1-shared-enrollment-foundation.md` — R2 Phase 1, already delivered (`R2-P1-001` in TASK-BACKLOG)  
4. Lab phones only with explicit wipe approval  
5. `docs/superpowers/specs/2026-11-12-r1f-merchant-web-customer-android-design.md` — R1f reference  
6. `docs/superpowers/plans/2026-11-12-r1f-merchant-web-customer-android.md`

## Do Not

- Scaffold remaining apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim live Omise, SMS OTP, refunds, or device unlock from payment webhooks
- Claim production OCR integration complete without real credentials/evidence
