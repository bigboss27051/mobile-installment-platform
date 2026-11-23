# Project Status

**Updated:** 2026-11-23  
**Current Phase:** R2 **Android lab COMPLETE** (Phases 1–4 + recovery closeout). Next: R3 SaaS parallel; Phase 5–6 iOS **BLOCKED** on ABM/MDM; Phase 7 production validation unclaimed.  
**Branch:** `develop`  
**Codebase:** NestJS backend R0–R1f + R2 Android lab (DPC/agent/policy/payment-unlock/recovery); Merchant Web; Customer Android; CI on push/PR

## Summary

R0 foundation plus **R1a–R1f** are delivered on `develop`. **R2 Android lab** (D-068) is closed for software + Pad 6 evidence: enrollment QR/check-in, lock/restrict/reminder, heartbeat, HTTPS lab, payment-to-unlock, overdue ladder + merchant policy settings, FCM/WorkManager poller, and full recovery types with Merchant Web UI. **Not** production Device Owner / financing approval. Omise live, SMS OTP, refunds, and iOS MDM remain BLOCKED or incomplete.

## Completed

- Phase 0 product discovery + sign-off
- Decisions D-001..D-068 (`DECISION-LOG.md`)
- R0–R1f as previously recorded
- R2 Android Phases 1–4 lab + `R2-P4-010` recovery closeout
- `.github/workflows/ci.yml` for backend + merchant-web + customer-android

## In Progress / Next

- **R3** SaaS operations (Super Admin, billing separation, reporting, hardening) — LINE sandbox P0 done; production LINE BLOCKED
- **Human / external:** Apple ABM + MDM vendor before Phase 5; multi-SKU / Zero-touch lab (`DM0-001`) still BLOCKED without additional hardware
- Optional Pad E2E of policy approval queue (not required for Android lab complete)

## Follow-ups

- Expand RBAC beyond Phase 3a (branch-scoped staff rules)
- Production Omise/Opn adapter (BLOCKED on credentials)
- SMS OTP adapter (BLOCKED)
- Phase 5–6 iOS MDM lab (BLOCKED on Apple)
- Phase 7 commercial validation / security review for device

## Blocked

- External integrations remain BLOCKED until credentials/hardware
- Production DO/MDM/financing lock claims

## Next Session Entry Point

1. `docs/roadmap/CURRENT-PHASE.md`  
2. `docs/project-management/MASTER-EXECUTION-PLAN.md`  
3. R3 backlog / Super Admin slice (if continuing SaaS)  
4. Or Phase 5 iOS only after ABM + vendor MDM credentials  
5. Lab phones only with explicit wipe approval  

## Do Not

- Scaffold remaining apps in one shot
- Mark device/payment integrations production-ready without validation
- Claim live Omise, SMS OTP, refunds, or device unlock from unverified webhooks
- Claim production Device Owner / MDM / financing lock
