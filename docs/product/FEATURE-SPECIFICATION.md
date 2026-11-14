# Feature Specification

Features are tagged with release slice: `R0` `R1` `R2` `R3`.

## 1. Super Admin Web

| ID | Feature | Slice | Notes |
|----|---------|-------|-------|
| SA-01 | Global dashboard | R3 | Tenant/health KPIs |
| SA-02 | Tenant CRUD / verification | R0–R1 | Create/activate early |
| SA-03 | Suspend / reinstate tenant | R1 | Blocks new sales when suspended |
| SA-04 | Package & subscription management | R3 | Entitlements |
| SA-05 | Global reports | R3 | Aggregates without leaking PII unnecessarily |
| SA-06 | System configuration | R3 | Feature flags, provider toggles |
| SA-07 | Audit log explorer | R1 | Security-critical early |

## 2. Merchant Admin Web

| ID | Feature | Slice |
|----|---------|-------|
| MW-01 | Dashboard | R1 |
| MW-02 | Branch management | R0 |
| MW-03 | Employee & RBAC | R0 |
| MW-04 | Customer management | R1 |
| MW-05 | KYC review | R1 |
| MW-06 | Products / variants / pricing | R1 |
| MW-07 | Inventory & IMEI | R1 |
| MW-08 | Applications & scorecard review | R1 |
| MW-09 | Contracts & schedules | R1 |
| MW-10 | Payments & reconciliation views | R1 |
| MW-11 | Collection dashboard | R1–R2 |
| MW-12 | Device management console | R2 |
| MW-13 | Enforcement policy settings (presets + custom) | R2 |
| MW-17 | Enrollment wizard (QR / iOS instructions, session states) | R2 / DM1–DM2 |
| MW-14 | Installment plan settings (flat/reducing) | R1 |
| MW-15 | Reports | R3 |
| MW-16 | Tenant settings | R1 |

## 3. Merchant Mobile (Flutter)

| ID | Feature | Slice |
|----|---------|-------|
| MM-01 | Auth / branch select | R0–R1 |
| MM-02 | Dashboard | R1 |
| MM-03 | Customer registration + KYC capture | R1 |
| MM-04 | Product search + IMEI scanner | R1 |
| MM-05 | Installment calculator | R1 |
| MM-06 | Create application | R1 |
| MM-07 | Contract signing assist | R1 |
| MM-08 | Payment collection | R1 |
| MM-09 | Sales history | R1 |
| MM-10 | Notifications | R3 |
| MM-11 | Device status / request recovery | R2 |
| MM-12 | Enrollment wizard (Android QR / iOS Configurator checklist) | R2 |

## 4. Customer Mobile (Flutter)

| ID | Feature | Slice |
|----|---------|-------|
| CM-01 | Register / login OTP | R1 |
| CM-02 | KYC submission | R1 |
| CM-03 | Profile | R1 |
| CM-04 | Contract list/detail | R1 |
| CM-05 | Installment schedule + outstanding | R1 |
| CM-06 | Payment QR + history | R1 |
| CM-07 | Early settlement request | R1 |
| CM-08 | Device status | R2 |
| CM-09 | Notifications | R3 |
| CM-10 | Support | R3 |

## 5. Backend Domains

| Module | Slice | Key capabilities |
|--------|-------|------------------|
| Auth | R0 | Login, refresh, OTP, password reset |
| Tenant / Branch / User / RBAC | R0 | Isolation + permissions |
| Subscription | R3 | Plans, invoices, entitlements |
| Customer / KYC | R1 | Profiles, docs, review states |
| Product / Inventory / IMEI | R1 | Stock, reserve, uniqueness |
| Installment / Scorecard | R1 | Applications, scoring, approval |
| Contract | R1 | Versions, schedules, closure |
| Payment / Ledger | R1 | Intents, webhooks, allocation |
| Collection | R1–R2 | Overdue queues, workflows |
| Device | R2 | Registry, enrollment sessions, provisioning profiles, activation, bind, policies, commands, heartbeat, recovery |
| Notification | R3 | Templates + channels |
| Reporting | R3 | Operational/financial reports |
| Audit | R0–R1 | Immutable event store |

## 6. Android DPC

| ID | Feature | Slice |
|----|---------|-------|
| AD-01 | DeviceAdminReceiver + Device Owner PoC | R2 / DM0–DM3 |
| AD-02 | QR / token enrollment (Enterprise extras; no secrets; no Play Protect-off SOP) | R2 / DM1 |
| AD-03 | Heartbeat + identity | R2 / DM2–DM3 |
| AD-04 | Policy apply for levels 1–5 | R2 / DM3 |
| AD-05 | Command execution + ack | R2 / DM3 |
| AD-06 | Offline queue / retry | R2 / DM3 |
| AD-07 | Recovery / unlock path | R2 / DM4 |
| AD-08 | Audit events upload | R2 / DM3 |
| AD-09 | AMAPI vs custom DPC evaluation | DM0 — **AMAPI chosen (D-042)**; lab remaining |

### Level Mapping (Android)

| Level | UX | Technical intent |
|-------|----|------------------|
| 1 | Normal | Baseline policies only |
| 2 | Warning | Notify; no hard restriction |
| 3 | App limit | Restrict entertainment/social packages; allow phone/chat/banking allowlist |
| 4 | Screen lock | Lock task / lock screen with call-shop affordance |
| 5 | Suspend | Maximum restriction short of blocking emergency dial |

## 7. iOS MDM Integration

| ID | Feature | Slice |
|----|---------|-------|
| IO-01 | MDM provider adapter | R2 / DM0–DM3 |
| IO-02 | Enrollment + check-in (Configurator / ADE; Remote Management) | R2 / DM1–DM3 |
| IO-03 | Device info sync | R2 / DM3 |
| IO-04 | Supported commands only | R2 / DM3 |
| IO-05 | Capability matrix enforcement | R2 / DM3 |
| IO-06 | Command history | R2 / DM3 |
| IO-07 | Apple Business Model A vs B evaluation | DM0 — **Model B chosen (D-043)** |
| IO-08 | Activation (shop code optional) + contract bind | R2 / DM2 |

Unsupported Android-equivalent actions return structured `UNSUPPORTED_CAPABILITY` — never silently pretended.

## 8. Payment Feature Detail

1. Create Payment Intent with idempotency key  
2. Provider adapter returns QR payload  
3. Webhook verifies signature + replay protection  
4. Create Payment Transaction once  
5. Allocate to schedule lines  
6. Emit domain events → notifications / device recovery evaluation  

## 9. Enforcement Policy Feature Detail

Merchant settings object includes:

- Selected preset ID (optional)  
- Per-level: `enabled`, `overdue_days`, `requires_human_approval`  
- Contact channels for level 2  
- Allowlist packages for level 3 (defaults provided)  
- Recovery rules on payment  

Platform safety overrides always win over merchant settings.
