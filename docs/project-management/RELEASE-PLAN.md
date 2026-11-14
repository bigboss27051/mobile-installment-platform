# Release Plan

## Principles

- Vision is full-stack; shipment is sliced  
- A slice is releasable to internal staging when its acceptance criteria pass  
- External blockers listed explicitly  

## R0 — Foundation

**Goal:** Secure multi-tenant skeleton runnable locally.  
**Exit:** Auth, tenant/branch/RBAC, Compose, health, CI skeleton, isolation tests baseline.

## R1 — Installment Core

**Goal:** Merchant can sell a phone on installment and collect PromptPay sandbox payments.  
**Exit:** Inventory/IMEI, KYC, scorecard approval, contract+schedule (flat/reducing), payment verify+allocate, Merchant Web + Customer Android critical paths.

## R2 — Device (Provisioning & Enrollment)

**Goal:** Enroll Android/iOS devices onto contracts, then run graduated enforcement safely.  
**Internal slices:** DM0 feasibility (~2w) → DM1 enrollment foundation (2–3w) → DM2 registration/bind (2–3w) → DM3 management integration (3–4w) → DM4 automation (2–3w) → DM5 production readiness (2–3w). Estimates assume one squad; re-estimate after DM0.  
**Exit:** DM0 ADRs; Android enrollment on test devices (chosen stack); bind + isolation tests; levels 1–5 where supported; command audit/recovery; iOS adapter + capability matrix in **test** env — production still BLOCKED without evidence.

**Parallelism:** R3 non-device work and live-payment credential work can proceed during DM0–DM2. DM1 schema should wait for DM0’s Android/iOS recommendations (or an explicit “design for both” freeze). Enforcement automation (DM4) waits for DM3 adapters.

## R3 — SaaS Ops

**Goal:** Operate as a commercial SaaS.  
**Exit:** Super Admin subscription/packages, notifications channels, reporting, production hardening checklist.

## Mapping to Engineering Phases

| Release | Primary engineering phases |
|---------|----------------------------|
| R0 | Phase 1–3 |
| R1 | Phase 4–8 (core) + Phase 9 partial |
| R2 | Phase 10–11 |
| R3 | Phase 12–15 |
