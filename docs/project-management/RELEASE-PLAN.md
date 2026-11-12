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

## R2 — Device

**Goal:** Bind devices and run graduated enforcement safely.  
**Exit:** Android DO enrollment on test devices, levels 1–5, policy config UI, command audit/recovery; iOS adapter + capability matrix in test env.

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
