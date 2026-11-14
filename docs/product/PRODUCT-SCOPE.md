# Product Scope

## Dual-Track Scope

| Track | Meaning |
|-------|---------|
| Vision | Full master-plan capability set for commercial viability |
| Delivery | Release slices R0–R3; each slice must meet its acceptance criteria before expansion |

## In Scope (Vision)

- Multi-tenant SaaS with subscription packaging  
- Super Admin + Merchant Admin web  
- Merchant + Customer Flutter apps  
- Android DPC (Device Owner) with 5-level enforcement  
- iOS MDM integration via approved provider/adapter  
- Device **provisioning & enrollment** (sessions, QR/instructions, activation, contract bind, recovery)  
- Customer installment lifecycle: KYC → scorecard → approval → contract → payments → collection  
- Inventory + IMEI uniqueness and contract binding  
- PromptPay / payment gateway adapters, ledger, reconciliation  
- Notifications: push, SMS, email, LINE  
- Audit logs, reporting, monitoring, CI/CD, production runbooks  

## Out of Scope

- Platform-funded lending  
- Non-Thailand regulatory packs in pilot  
- Card PAN/CVV storage  
- OS security bypasses, hidden DPC, emergency-call blocking  
- Lost Mode as debt collection on iOS  
- Claiming integrations work without credentials/hardware validation  

## Release Slices

### R0 — Foundation
Auth, tenants, branches, RBAC, project skeleton, Docker Compose infra, health checks, CI lint/test skeleton.

### R1 — Installment Core
Merchant/inventory/IMEI, customer/KYC, installment application, scorecard, approve/reject, contracts, schedules (flat/reducing), PromptPay sandbox path, Merchant Web + Customer App (Android) critical flows.

### R2 — Device Management (Provisioning & Enrollment Platform)
Split internally as **DM0–DM5** (feasibility → enrollment foundation → bind → management integration → automation → production readiness). Includes Android QR/Enterprise enrollment, iOS Configurator/ADE/MDM (ownership model pending), activation, contract binding, 5-level policies (merchant presets + custom), command queue, heartbeat, audit, recovery; iOS capability matrix. See [../project-management/MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md).

### R3 — SaaS Operations
Super Admin complete, subscription billing separate from installment money, notification channels, advanced reporting, production hardening.

## Application Coverage by Slice

| App | R0 | R1 | R2 | R3 |
|-----|----|----|----|-----|
| Backend API | skeleton | core domains | device domain | subscription/notify/report |
| Super Admin Web | login shell | tenant basics | device ops views | full SaaS admin |
| Merchant Web | shell | core ops | device/collection | advanced reports/settings |
| Merchant Mobile | shell | sell/collect | device status actions | polish |
| Customer Mobile | shell | contracts/pay | device status | support/notify |
| Android DPC | — | — | primary | harden |
| iOS MDM adapter | — | — | adapter + sandbox | expand capabilities |

## Blocked Until External Dependency

| Area | Required dependency |
|------|---------------------|
| Live PromptPay settle | Licensed gateway credentials |
| E-signature production | Provider account + legal templates |
| OCR KYC automation | OCR vendor (manual KYC remains available) |
| Android Device Owner / AMAPI proof | Physical devices + QR/Zero-touch evaluation (DM0) |
| iOS MDM | Apple Business eligibility + MDM provider / APNs + Configurator/ADE (DM0) |
| LINE / SMS production | Provider accounts + consent templates |
