# Product Requirements Document (PRD)

**Product:** Mobile Installment SaaS Platform  
**Version:** 0.2 (Phase 0 + R2 enrollment expansion 2026-11-14)  
**Market:** Thailand  
**Status:** Active planning; R1 delivered, R2 gated on DM0  

## 1. Vision

Enable mobile phone retailers to run installment sales end-to-end: customer onboarding, KYC, inventory/IMEI control, credit decision support, contracts, collections, payments, and optional device enforcement — as a secure multi-tenant SaaS.

The platform does **not** fund customer credit. Merchants carry receivables and configure commercial terms within platform rules.

## 2. Problem

Independent phone shops struggle to operate installment programs with consistent KYC, contract schedules, payment reconciliation, collections discipline, and device collateral controls. Spreadsheet workflows leak data, duplicate payments, and cannot scale across branches or employees.

## 3. Goals

1. Multi-tenant isolation with branch-aware RBAC  
2. Accurate installment schedules using decimal-safe math (flat or reducing)  
3. Reliable payment capture via PromptPay and verified webhooks  
4. Merchant-configurable graduated device enforcement (Android primary; iOS via MDM adapter), with an auditable **provisioning and enrollment** path before any restriction  
5. Auditable credit decisions via scorecard + merchant approval  
6. Production-grade ops path: tests, security, monitoring, deployment docs  

## 4. Non-Goals (Phase 0 / near-term)

- Platform lending / balance-sheet funding of customer loans  
- Multi-country localization beyond Thailand  
- Bypassing Android/iOS OS security restrictions  
- Using Lost Mode or hidden persistence as debt collection  
- Storing card PAN/CVV  

## 5. Personas

| Persona | Needs |
|---------|--------|
| Platform Owner (Super Admin) | Tenant lifecycle, subscriptions, global risk/ops |
| Merchant Owner | Branches, employees, plans, enforcement policy, P&L |
| Merchant Staff | Register customers, KYC, sell, collect payments |
| Customer | Apply, view contracts, pay, see device status, support |
| Collector / Ops | Overdue queues, authorized device actions, recovery |

## 6. Success Metrics (Pilot)

- Zero cross-tenant data access in automated tests  
- Payment webhook duplicates do not create duplicate allocations  
- Schedule totals match contract terms within rounding rules  
- Device restrictive actions require reason + authorization trail  
- Merchant can complete sale → contract → first payment in under agreed pilot SLA (to be measured in R1)  

## 7. Product Principles

1. Money correctness over feature speed  
2. Tenant isolation is non-negotiable  
3. Device control is graduated, consented, recoverable, and auditable  
4. External systems always behind adapters  
5. Incomplete integrations are marked BLOCKED, never “done”  

## 8. Constraints

- Stack: NestJS, PostgreSQL, Prisma, Redis, BullMQ, React admin apps, Flutter mobile, Kotlin DPC  
- Compliance posture: PDPA-aware data handling for Thailand  
- Device: emergency calling must remain available at all enforcement levels  
- Enrollment QR/instructions must not carry passwords or private keys; Play Protect disable is not a required step  
- iOS management requires Apple organizational authorization; model A vs B is pending DM0  

## 9. Dependencies

Payment gateway account, e-signature provider, OCR/KYC vendor (optional), Apple MDM/APNs or MDM provider, Android Enterprise test devices, SMS/LINE/email providers.

## 10. Related Documents

- [PRODUCT-SCOPE.md](./PRODUCT-SCOPE.md)  
- [FEATURE-SPECIFICATION.md](./FEATURE-SPECIFICATION.md)  
- [USER-JOURNEY.md](./USER-JOURNEY.md)  
- [../superpowers/specs/2026-11-12-phase-0-product-discovery-design.md](../superpowers/specs/2026-11-12-phase-0-product-discovery-design.md)  
- [../project-management/MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)  
- [../device-management/README.md](../device-management/README.md)  
