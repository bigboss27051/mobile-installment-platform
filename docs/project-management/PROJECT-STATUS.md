# Project Status

**Updated:** 2026-11-14  
**Current Phase:** R1f complete; DM0 **architecture accepted**; next = **DM0 lab** (not DM1 code)  
**Branch:** `develop`  
**Codebase:** NestJS backend R0–R1e plus R1f customer OTP/`/me` portal, Merchant Web, Customer Android on `develop`; CI on push/PR

## Summary

R0 foundation plus **R1a–R1f** are delivered on `develop`. R1f adds tenant `slug`, sandbox customer OTP JWT (`typ=customer`), customer-scoped contract/payment APIs, Merchant Web critical ops, and Customer Android OTP/contract/QR pay. Staff sandbox payments from R1e remain. **Phase 3 full RBAC is not complete.** Omise live adapter, SMS OTP, refunds, and MDM are not claimed complete.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-040 (`DECISION-LOG.md`)
- R0–R1e as previously recorded
- R1f: customer OTP sandbox auth, public tenant slug, `/me` contracts/intents, Merchant Web (Vite React), Customer Android (Flutter) critical paths, CI jobs for web + Flutter tests
- `.github/workflows/ci.yml` for backend + merchant-web + customer-android

## In Progress

- Documentation: R2 expanded to enrollment platform (2026-11-14). **DM0** is the next gated slice. Hardware/Apple/Google proof BLOCKED for production claims. No device application code in this update.

## Follow-ups (R0 / early Phase 3)

- Full RBAC permission matrix and branch-scoped staff rules
- Swagger polish on `/api/v1` endpoints
- BullMQ worker wiring and job definitions
- Production Omise/Opn adapter (BLOCKED on credentials)
- Production OCR vendor integration (BLOCKED on credentials/proof)
- SMS OTP adapter (BLOCKED)
- Device/MDM integrations (BLOCKED on hardware/proof)

## Blocked

- External integrations remain BLOCKED until credentials/hardware

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md` — DM0  
2. `docs/project-management/MASTER-EXECUTION-PLAN.md`  
3. `docs/device-management/README.md`  
4. `docs/superpowers/specs/2026-11-12-r1f-merchant-web-customer-android-design.md` — R1f reference  
5. `docs/superpowers/plans/2026-11-12-r1f-merchant-web-customer-android.md`

## Do Not

- Scaffold remaining apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim Phase 3 RBAC or BullMQ production-ready until implemented and tested
- Claim live Omise, SMS OTP, refunds, or device unlock from payment webhooks
- Claim production OCR integration complete without real credentials/evidence
