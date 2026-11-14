# Master Execution Plan

**Product:** Mobile Installment SaaS Platform (Thailand pilot)  
**Updated:** 2026-11-14  
**Status:** R1 installment core complete on `develop`. Device work is **R2** as a Device Provisioning & Enrollment Platform. Next **software** slice is **Phase 1 — Shared Enrollment Foundation**, then **Phase 2 — Android QR Provisioning**. Hardware wipe still requires human approval.  
**Scope of this update:** Android shop enrollment is **QR custom DPC / Device Owner** (D-057). iPhone enrollment remains **merchant-assisted Apple Configurator + Apple Business / MDM** (D-043). No application source code is changed by this revision.

This document is the index for the dual-track master plan. Detailed product, architecture, database, and API content remains in the linked files. Do not duplicate those definitions here.

## 1. Vision (unchanged)

Enable mobile phone retailers to run installment sales end-to-end: onboarding, KYC, inventory/IMEI, credit decision support, contracts, collections, payments, and **mandatory, consented, recoverable device management**.

The platform does **not** fund customer credit. Merchants carry receivables.

**Enrollment UX (this revision):**

- **Android:** customer scans a merchant QR during initial setup (no PC for normal enrollment).  
- **iPhone:** merchant prepares the device with Apple-supported Configurator / ABM / MDM before handover.  
- **Both:** bind customer, merchant, device, and installment contract; authorized restriction; payment-based unlock.

## 2. Confirmed technology direction (unchanged unless noted)

| Layer | Decision | Status |
|-------|----------|--------|
| Backend | NestJS + TypeScript, modular monolith, REST `/api/v1` | Accepted (D-009, D-048) |
| Database | PostgreSQL + Prisma, UUID PKs, DECIMAL money | Accepted |
| Cache / jobs | Redis + BullMQ | Accepted |
| Merchant / Super Admin web | React (Merchant Web exists as Vite in R1f) | Accepted; no stack change |
| Mobile | Flutter + Bloc/Cubit (customer / merchant apps) | Accepted |
| Android | **Native Kotlin custom DPC + Device Owner + Enterprise QR** (D-057). Zero-touch when reseller-registered (D-049) | AMAPI (D-042) superseded for *implementation*; still evaluated; EMI lock via AMAPI forbidden without exception (D-054) |
| iOS | Merchant ABM (**Model B**) + vendor MDM (`MdmProviderPort`) + Configurator iPhone (D-043) | Follow Apple rules (D-047); SAM lock (D-056) |
| Auth | JWT staff + customer OTP JWT | Accepted (D-037) |

Preserve Nest/Postgres/Flutter. Do not claim production Device Owner / MDM / financing approval without evidence.

## 3. Document map

| Topic | Canonical file |
|-------|----------------|
| Product vision | [../product/PRD.md](../product/PRD.md) |
| Dual-track scope / R0–R3 | [../product/PRODUCT-SCOPE.md](../product/PRODUCT-SCOPE.md) |
| Features | [../product/FEATURE-SPECIFICATION.md](../product/FEATURE-SPECIFICATION.md) |
| Journeys | [../product/USER-JOURNEY.md](../product/USER-JOURNEY.md) |
| Roles | [../product/USER-ROLES.md](../product/USER-ROLES.md) |
| Business rules | [../product/BUSINESS-REQUIREMENTS.md](../product/BUSINESS-REQUIREMENTS.md) |
| Acceptance | [../product/ACCEPTANCE-CRITERIA.md](../product/ACCEPTANCE-CRITERIA.md) |
| System architecture | [../architecture/SYSTEM-ARCHITECTURE.md](../architecture/SYSTEM-ARCHITECTURE.md) |
| Android DPC | [../architecture/android-dpc-architecture.md](../architecture/android-dpc-architecture.md) |
| Android QR | [../architecture/android-qr-provisioning.md](../architecture/android-qr-provisioning.md), [../device-management/ANDROID-ENROLLMENT.md](../device-management/ANDROID-ENROLLMENT.md) |
| Android kiosk | [../architecture/android-kiosk-locking.md](../architecture/android-kiosk-locking.md) |
| Lock state machine | [../architecture/device-lock-state-machine.md](../architecture/device-lock-state-machine.md) |
| Payment-to-unlock | [../architecture/payment-to-unlock.md](../architecture/payment-to-unlock.md) |
| iOS MDM | [../architecture/ios-mdm-architecture.md](../architecture/ios-mdm-architecture.md) |
| iOS enrollment | [../architecture/ios-enrollment-workflow.md](../architecture/ios-enrollment-workflow.md), [../device-management/IOS-ENROLLMENT.md](../device-management/IOS-ENROLLMENT.md) |
| iOS Single App Mode | [../architecture/ios-single-app-mode.md](../architecture/ios-single-app-mode.md) |
| Integrations | [../architecture/INTEGRATION-ARCHITECTURE.md](../architecture/INTEGRATION-ARCHITECTURE.md) |
| Security | [../architecture/SECURITY-ARCHITECTURE.md](../architecture/SECURITY-ARCHITECTURE.md), [../security/SECURITY-BASELINE.md](../security/SECURITY-BASELINE.md) |
| Database | [../database/DATABASE-DESIGN.md](../database/DATABASE-DESIGN.md), [../database/ERD.md](../database/ERD.md) |
| APIs | [../api/API-STANDARDS.md](../api/API-STANDARDS.md), [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md) |
| Merchant enrollment | [../device-management/DEVICE-PROVISIONING-ENROLLMENT.md](../device-management/DEVICE-PROVISIONING-ENROLLMENT.md), [../device-management/ENROLLMENT-WIZARD-MOCKUP.md](../device-management/ENROLLMENT-WIZARD-MOCKUP.md) |
| Merchant dashboard | [../device-management/MERCHANT-DEVICE-DASHBOARD.md](../device-management/MERCHANT-DEVICE-DASHBOARD.md) |
| Testing | [../testing/TEST-STRATEGY.md](../testing/TEST-STRATEGY.md) |
| Production feasibility | [../device-management/PRODUCTION-FEASIBILITY.md](../device-management/PRODUCTION-FEASIBILITY.md) |
| Roadmap now | [../roadmap/CURRENT-PHASE.md](../roadmap/CURRENT-PHASE.md) |
| Decisions | [DECISION-LOG.md](./DECISION-LOG.md) |
| Risks | [RISK-REGISTER.md](./RISK-REGISTER.md) |

## 4. Release slices (preserved)

| Slice | Focus | Status |
|-------|--------|--------|
| **R0** Foundation | Auth, tenants, branches, Compose, CI | Delivered |
| **R1** Installment core | Inventory → KYC → application → contract → sandbox PromptPay + Merchant Web / Customer Android | Delivered (R1a–R1f) |
| **R2** Device | Provisioning, enrollment, bind, policy, commands, recovery | **In progress (stubs).** DM1/DM2 API stubs exist. Phases 1–7 below replace a single “AMAPI then lock” burst |
| **R3** SaaS operations | Super Admin billing, notifications, reporting, hardening | Unchanged; non-device work may proceed in parallel |

R2 remains a **provisioning and enrollment platform** plus later policy automation. Do not implement all phases at once.

## 5. Device Management lifecycle (target)

1. Create installment contract (R1 already exists).  
2. Select platform: Android or iOS.  
3. Create enrollment session (short-lived, tenant-scoped, auditable).  
4. Android: generate QR. iOS: merchant Configurator / ABM instructions.  
5. Provision and enroll using OS-supported flows.  
6. Verify device identity.  
7. Activate device management (merchant + customer).  
8. Bind device to the installment contract (one active binding per IMEI/device).  
9. Apply authorized policies (REMINDER / RESTRICT / LOCK via shared engine).  
10. Heartbeat and management events.  
11. Verified payment → unlock orchestrator.  
12. Recovery, reassignment, unenrollment, replacement, contract termination.

Sessions must be **secure, expiring, retryable, and tenant-isolated**. Restrictive commands remain reason + authz + audit. Emergency calling must remain available. Unverified payments must never raise restriction.

## 6. What this revision does not change

- Installment math, KYC, inventory IMEI uniqueness, PromptPay sandbox path  
- Modular monolith and REST conventions  
- 5-level enforcement product intent (D-003, D-004) — mapped to REMINDER/RESTRICT/LOCK  
- iOS Lost Mode forbidden for collections  
- Adapter pattern and BLOCKED-until-proof rule  
- R3 SaaS billing remaining separate from installment ledgers  
- D-043 / D-044 / D-045 / D-047 / D-050 / D-056  

## 7. Implementation priority (recalculated)

Estimates assume one focused team, existing DM1/DM2 stubs, and **no** parallel phase jumps. Hardware/Apple/Google wait time is **not** included.

| Phase | Focus | Estimate | Depends on |
|-------|--------|----------|------------|
| **1 — Shared Enrollment Foundation** | Registry, sessions, tokens, identity, activation, contract bind, merchant wizard states including `QR_GENERATED`, dashboard fields | **1.5–2 weeks** | Done stubs; expand tests + statuses |
| **2 — Android QR Provisioning** | Kotlin DPC, Device Owner, QR extras, DPC install, registration, activation on **authorized** lab devices | **2–3 weeks** | Phase 1; lab phone (ask before wipe) |
| **3 — Android Locking Prototype** | Package restrict, Lock Task Mode, Mango Lock UI, lock/unlock commands, reboot recovery | **2–3 weeks** | Phase 2 Device Owner evidence |
| **4 — Payment Integration** | Verified payment → policy; Payment-to-Unlock; offline retry | **1.5–2 weeks** | Phase 3 + R1 payments |
| **5 — iOS Enrollment** | Configurator, Apple Business, supervised enroll, MDM adapter, bind | **2–3 weeks** | Phase 1; ABM + vendor (**often BLOCKED** on Apple ops) |
| **6 — iOS Locking** | Single App Mode, MDM restrictions, Mango Lock UI, payment unlock | **1.5–2 weeks** | Phase 5 + 4 orchestrator |
| **7 — Production Validation** | Compatibility, policy review, distribution, security, recovery, commercial readiness | **2–4 weeks** + external reviews | Phases 2–6 evidence |

**Do not** start Phase 3 until Phase 2 has at least one real Device Owner check-in. **Do not** start Phase 6 until Phase 5 has supervised check-in. R3 may proceed independently.

Mapping to older DM ids: Phase 1 ≈ DM1–DM2 hardening; Phase 2–3 ≈ DM3 Android; Phase 4 ≈ DM4; Phase 5–6 ≈ iOS DM; Phase 7 ≈ DM5.

## 8. Open decisions (must not be silently closed)

See D-041+ in the Decision Log and [../device-management/OPEN-DECISIONS.md](../device-management/OPEN-DECISIONS.md).

**Accepted for implementation:** D-057 (custom DPC QR), D-043 (iOS Model B), D-056 (SAM).  
**Still open:** MDM vendor SKU, DPC download hosting / Play eligibility, compatibility matrix, ABM onboarding ops, legal copy (D-051), factory-reset enterprise re-enroll method, whether Google ever grants AMAPI EMI exception (D-054).

**Do not claim production Device Owner / MDM / financing lock until evidence exists.**

## 9. Next implementation phase

**Software (this repo):** Phase 1 Shared Enrollment Foundation — see [../superpowers/plans/2026-11-14-phase1-shared-enrollment-foundation.md](../superpowers/plans/2026-11-14-phase1-shared-enrollment-foundation.md) (to be executed only after this documentation revision is accepted).

**People:** authorized lab Android (do not factory-reset without asking); Apple Business + MDM vendor still required before Phase 5. Google AMAPI inquiry remains optional/historical ([../device-management/OPERATOR-PACKET.md](../device-management/OPERATOR-PACKET.md)).

Wizard: [../device-management/ENROLLMENT-WIZARD-MOCKUP.md](../device-management/ENROLLMENT-WIZARD-MOCKUP.md).

## 10. Definition of Done for commercial pilot

Pilot readiness requires R0–R3 acceptance for in-scope features, with external blockers listed rather than marked complete. Device work additionally requires Phases 1–7 exit criteria in [../product/ACCEPTANCE-CRITERIA.md](../product/ACCEPTANCE-CRITERIA.md) and [../device-management/PRODUCTION-FEASIBILITY.md](../device-management/PRODUCTION-FEASIBILITY.md).
