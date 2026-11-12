# R1f Merchant Web + Customer Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline; user requested execute). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merchant Web + Customer Android critical paths on real `/api/v1` APIs, plus customer OTP sandbox auth and customer-scoped payment intents.

**Architecture:** Nest adds public tenant slug lookup, customer OTP JWT (`typ=customer`), and `/me/*` contract/payment routes. Merchant Web (Vite React) uses staff JWT. Customer Flutter uses customer JWT. Sandbox webhook path unchanged.

**Tech Stack:** NestJS 10, Prisma 6, Jest/supertest, Vite React + Vitest, Flutter 3, pnpm.

---

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1f-merchant-web-customer-android-design.md`
- D-036…D-040
- Decimal money; no float
- Customer tokens must not pass staff `JwtAuthGuard`
- Sandbox OTP from `CUSTOMER_OTP_SANDBOX_CODE` (default `123456`)
- Do not scaffold Super Admin / Merchant Mobile / DPC
- TDD on customer auth + isolation e2e

## File Structure

```text
backend/prisma/schema.prisma
backend/src/auth/strategies/jwt.strategy.ts
backend/src/auth/strategies/jwt-customer.strategy.ts
backend/src/auth/guards/customer-jwt.guard.ts
backend/src/auth/customer-auth.service.ts
backend/src/auth/customer-auth.controller.ts
backend/src/tenants/public-tenants.controller.ts
backend/src/portal/portal.controller.ts
backend/src/portal/portal.service.ts
apps/merchant-web/*
apps/customer-mobile/*
```

### Task 1: Schema — tenant slug, OTP, nullable payment actor

- [ ] Add `Tenant.slug` unique
- [ ] `CustomerOtpChallenge` model
- [ ] `PaymentIntent.createdByUserId` optional + `createdByCustomerId`
- [ ] Migrate

### Task 2: Customer OTP + JWT strategy split

- [ ] Failing unit tests for OTP request/verify
- [ ] Implement request/verify; staff JWT rejects `typ=customer`
- [ ] Public slug GET

### Task 3: `/me` contracts + customer intents

- [ ] Failing tests: own contract only; other tenant 401/404; create intent
- [ ] Implement portal + payments actor customer
- [ ] Schedule `amountPaid` on contract detail
- [ ] E2E isolation

### Task 4: Merchant Web

- [ ] Vite React app: login + products/inventory/customers/applications/contracts + pay intent
- [ ] Vitest API client
- [ ] CORS on Nest

### Task 5: Customer Flutter

- [ ] OTP login, contracts, pay QR
- [ ] Unit test: unpaid unless server status SUCCEEDED

### Task 6: CI + exit docs

- [ ] CI jobs for merchant-web tests; Flutter if SDK available
- [ ] CURRENT-PHASE / PROJECT-STATUS / CHANGELOG / DECISION-LOG
