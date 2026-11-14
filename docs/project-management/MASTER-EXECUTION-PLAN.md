# Master Execution Plan

**Product:** Mobile Installment SaaS Platform (Thailand pilot)  
**Updated:** 2026-11-14  
**Status:** R1 installment core complete on `develop`. Device work is gated on **DM0** feasibility.  
**Scope of this update:** Device Management is expanded from “optional enforcement after contract” to a **Device Provisioning & Enrollment Platform**. No application source code is changed by this revision.

This document is the index for the dual-track master plan. Detailed product, architecture, database, and API content remains in the linked files. Do not duplicate those definitions here.

## 1. Vision (unchanged)

Enable mobile phone retailers to run installment sales end-to-end: onboarding, KYC, inventory/IMEI, credit decision support, contracts, collections, payments, and **optional, consented, recoverable device management**.

The platform does **not** fund customer credit. Merchants carry receivables.

## 2. Confirmed technology direction (unchanged unless noted)

| Layer | Decision | Status |
|-------|----------|--------|
| Backend | NestJS + TypeScript, modular monolith, REST `/api/v1` | Accepted (D-009) |
| Database | PostgreSQL + Prisma, UUID PKs, DECIMAL money | Accepted |
| Cache / jobs | Redis + BullMQ | Accepted |
| Merchant / Super Admin web | React (Merchant Web exists as Vite in R1f; Next.js not required to replace it) | Accepted; no stack change |
| Mobile | Flutter + Bloc/Cubit | Accepted |
| Android | **Android Management API** (D-042); QR + Zero-touch when reseller-registered (D-049) | Custom DPC not primary EMM |
| iOS | Merchant ABM (**Model B**) + vendor MDM (`MdmProviderPort`) + Configurator iPhone (D-043) | Follow Apple rules (D-047) |
| Auth | JWT staff + customer OTP JWT | Accepted (D-037) |

Preserve these decisions. DM0 lab validates adapters (AMAPI, MDM vendor) without replacing Nest/Postgres/Flutter.

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
| Integrations | [../architecture/INTEGRATION-ARCHITECTURE.md](../architecture/INTEGRATION-ARCHITECTURE.md) |
| Security | [../architecture/SECURITY-ARCHITECTURE.md](../architecture/SECURITY-ARCHITECTURE.md), [../security/SECURITY-BASELINE.md](../security/SECURITY-BASELINE.md) |
| Database | [../database/DATABASE-DESIGN.md](../database/DATABASE-DESIGN.md), [../database/ERD.md](../database/ERD.md) |
| APIs | [../api/API-STANDARDS.md](../api/API-STANDARDS.md), [../api/DEVICE-ENROLLMENT-API.md](../api/DEVICE-ENROLLMENT-API.md) |
| Device provisioning | [../device-management/](../device-management/) |
| Roadmap now | [../roadmap/CURRENT-PHASE.md](../roadmap/CURRENT-PHASE.md) |
| Decisions | [DECISION-LOG.md](./DECISION-LOG.md) |
| Risks | [RISK-REGISTER.md](./RISK-REGISTER.md) |

## 4. Release slices (preserved)

| Slice | Focus | Status |
|-------|--------|--------|
| **R0** Foundation | Auth, tenants, branches, Compose, CI | Delivered |
| **R1** Installment core | Inventory → KYC → application → contract → sandbox PromptPay + Merchant Web / Customer Android | Delivered (R1a–R1f) |
| **R2** Device | Provisioning, enrollment, bind, policy, commands, recovery | **Not started**. Split into DM0–DM5 |
| **R3** SaaS operations | Super Admin billing, notifications, reporting, hardening | Unchanged; can proceed in parallel with DM0–DM2 for non-device work |

R2 is no longer a single “Android DPC 5 levels + iOS adapter” implementation burst. It is a **provisioning and enrollment platform** plus later policy automation. Enforcement levels 1–5 remain the *management* target after enrollment is proven.

## 5. Device Management lifecycle (target)

1. Create installment contract (R1 already exists).  
2. Select platform: Android or iOS.  
3. Create enrollment session (short-lived, tenant-scoped, auditable).  
4. Present QR (Android) or platform-specific instructions (iOS).  
5. Provision and enroll the device using OS-supported flows.  
6. Verify device identity (hardware / MDM / Enterprise identifiers).  
7. Activate device management.  
8. Register customer and merchant association.  
9. Bind device to the installment contract (one active binding per IMEI/device).  
10. Apply authorized policies (levels 1–5 on Android; capability-gated on iOS).  
11. Heartbeat and management events.  
12. Recovery, reassignment, unenrollment, replacement, contract termination.

Sessions must be **secure, expiring, retryable, and tenant-isolated**. Restrictive commands remain reason + authz + audit. Emergency calling must remain available. Unverified payments must never raise restriction.

## 6. What this revision does not change

- Installment math, KYC, inventory IMEI uniqueness, PromptPay sandbox path  
- Modular monolith and REST conventions  
- 5-level enforcement product intent (D-003, D-004)  
- iOS Lost Mode forbidden for collections  
- Adapter pattern and BLOCKED-until-proof rule  
- R3 SaaS billing remaining separate from installment ledgers  

## 7. Open decisions (must not be silently closed)

See D-041+ in the Decision Log and [../device-management/OPEN-DECISIONS.md](../device-management/OPEN-DECISIONS.md).

Architecture choices **D-042 / D-043 / D-049 / D-050** are accepted. Remaining: MDM vendor SKU, AMAPI quotas, policy-level mapping, compatibility matrix, ABM onboarding ops, legal copy (D-051).

**Do not claim production Device Owner / MDM until lab evidence exists** ([../device-management/DM0-LAB-PROTOCOL.md](../device-management/DM0-LAB-PROTOCOL.md)).

## 8. Next implementation phase

Desk lab 2026-11-14 is in [../device-management/DM0-FEASIBILITY-REPORT.md](../device-management/DM0-FEASIBILITY-REPORT.md). **D-054:** do not ship AMAPI lock-on-overdue without Google exception. Physical enroll still required. Wizard: [../device-management/ENROLLMENT-WIZARD-MOCKUP.md](../device-management/ENROLLMENT-WIZARD-MOCKUP.md).

## 9. Definition of Done for commercial pilot (Part 10)

Pilot readiness requires R0–R3 acceptance for in-scope features, with external blockers listed rather than marked complete. Device work additionally requires DM0–DM5 exit criteria in [../product/ACCEPTANCE-CRITERIA.md](../product/ACCEPTANCE-CRITERIA.md).
