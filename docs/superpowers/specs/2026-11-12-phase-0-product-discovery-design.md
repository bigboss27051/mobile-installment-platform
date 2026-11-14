# Phase 0 Product Discovery Design

**Date:** 2026-11-12  
**Status:** Approved for documentation  
**Project:** Mobile Installment SaaS Platform

## Decisions Locked

| ID | Topic | Decision |
|----|-------|----------|
| D-001 | Credit funding | Merchant self-funded; platform is ops/software only |
| D-002 | Market | Thailand only for commercial pilot |
| D-003 | Device enforcement | Graduated 5-level policy |
| D-004 | Enforcement config | Merchant chooses presets + custom overdue days / approval gates |
| D-005 | Interest | Flat or reducing balance selectable per installment plan |
| D-006 | Pilot ambition | Full-stack vision per master plan; implement by release slices |
| D-007 | Credit approval | Risk scorecard then merchant approve/reject |
| D-008 | Discovery approach | Dual-track: full vision PRD + phased PRODUCT-SCOPE |

## Product Model

- Multi-tenant SaaS for mobile phone retailers selling on installment
- Merchants hold receivables; platform does not fund customer credit
- Apps: Super Admin Web, Merchant Web, Merchant Mobile, Customer Mobile, Android DPC, iOS MDM adapter
- Payments: PromptPay-first via licensed gateway adapters; webhook verification + idempotency
- Device: Android Device Owner path with 5 enforcement levels; iOS via MDM provider adapter with separate capability matrix
- Safety floors: emergency calls always available; no lock from unverified payment webhooks; commands audited with reason

## Device Enforcement Levels

1. Normal usage  
2. Overdue warning (usable + alerts)  
3. App limitation (entertainment/social restricted; phone/chat/banking remain)  
4. Screen lock (call-shop path remains)  
5. Device suspension (maximum restriction; emergency calling required; recovery path required)

## Release Slices

| Slice | Focus |
|-------|--------|
| R0 | Foundation: monorepo, auth, tenant, RBAC, Docker, CI |
| R1 | Installment core: inventory/IMEI, KYC, application, scorecard, contract, schedule, PromptPay |
| R2 | Device: provisioning & enrollment platform (DM0–DM5); Android DPC/AMAPI 5 levels + iOS MDM adapter — see 2026-11-14 spec |
| R3 | SaaS ops: Super Admin complete, subscription billing, multi-channel notifications, reporting |

## Architecture Direction

- Modular monolith (NestJS + Prisma + PostgreSQL + Redis + BullMQ)
- Domain logic isolated from infrastructure; integrations behind adapters
- Every business record tenant-scoped; server-side authorization
- Decimal-safe financial calculations only
- SaaS subscription billing separated from customer installment payments

## Phase 0 Boundary

**In scope:** Product, architecture draft, domain/ERD draft, API standards, risks, backlog, Cursor agent/rules stubs, README  
**Out of scope:** Application scaffolding, claiming external integrations work, Device Owner claims without hardware validation

## Assumptions

- A-001: OCR, e-signature, payment, MDM providers start as adapters + sandbox/mock until credentials exist
- A-002: Thai National ID is primary KYC identity document
- A-003: PromptPay QR is primary customer payment method for pilot
- A-004: Android Device Owner enrollment requires physical test devices later
- A-005: iOS capabilities are a subset of Android; Lost Mode is not used for debt collection
