# R1e Payment Verify + Allocate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver staff-created idempotent PromptPay sandbox payment intents, HMAC-verified webhooks, FIFO multi-installment allocation, and simple installment ledger postings on ACTIVE contracts.

**Architecture:** Nest `payments` module owns intents/transactions/allocations/ledger. Pure `allocateFifo` helper is unit-tested. `PaymentGatewayPort` + `SandboxPaymentAdapter` create QR payloads and verify HMAC webhooks. Omise production adapter is not implemented (BLOCKED). No device side effects from webhooks.

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest, Prisma.Decimal, Node `crypto` (HMAC-SHA256), existing JwtAuthGuard / TenantContext, pnpm (`corepack pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1e-payment-allocate-design.md`
- Decisions: D-032…D-035
- Money: DECIMAL / Prisma.Decimal only — no float
- Header `Idempotency-Key` required on create intent
- Env: `PAYMENT_WEBHOOK_SECRET` (min 32 chars), `PAYMENT_PROVIDER=sandbox`
- Postgres host port **5433**; JWT tenant only
- Backend API only — no UI / live Omise / refunds / customer auth
- TDD for allocate + webhook idempotency; frequent commits
- Never trigger device restrictive actions from payment webhooks

## File Structure

```text
backend/prisma/schema.prisma
backend/src/common/payments/allocate-fifo.ts
backend/src/common/payments/allocate-fifo.spec.ts
backend/src/common/payments/payment-gateway.port.ts
backend/src/common/payments/sandbox-payment.adapter.ts
backend/src/common/payments/sandbox-payment.adapter.spec.ts
backend/src/common/payments/payments-gateway.module.ts
backend/src/payments/payments.module.ts
backend/src/payments/payments.service.ts
backend/src/payments/payments.service.spec.ts
backend/src/payments/payments.controller.ts
backend/src/payments/webhooks.controller.ts
backend/src/payments/dto/*.ts
backend/src/config/env.validation.ts
.env.example
backend/src/app.module.ts
backend/test/payments.e2e-spec.ts
.github/workflows/ci.yml
docs/roadmap/CURRENT-PHASE.md
docs/project-management/PROJECT-STATUS.md
docs/project-management/CHANGELOG.md
```

---

### Task 1: Prisma schema for payments + schedule amountPaid

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration `r1e_payment_allocate`

**Changes:**

1. Extend `ScheduleItemStatus`:

```prisma
enum ScheduleItemStatus {
  PENDING
  PARTIAL
  PAID
}
```

2. Add to `PaymentScheduleItem`:

```prisma
amountPaid Decimal @default(0) @map("amount_paid") @db.Decimal(18, 2)
allocations Allocation[]
```

3. Add enums/models:

```prisma
enum PaymentIntentStatus {
  CREATED
  AWAITING_PROVIDER
  SUCCEEDED
  FAILED
  CANCELLED
  EXPIRED
}

enum PaymentTransactionStatus {
  SUCCEEDED
  FAILED
}

enum LedgerDirection {
  DEBIT
  CREDIT
}

enum LedgerDomain {
  INSTALLMENT
  SAAS
}

model PaymentIntent {
  id              String              @id @default(uuid()) @db.Uuid
  tenantId        String              @map("tenant_id") @db.Uuid
  contractId      String              @map("contract_id") @db.Uuid
  amount          Decimal             @db.Decimal(18, 2)
  currency        String              @default("THB") @db.Char(3)
  idempotencyKey  String              @map("idempotency_key")
  status          PaymentIntentStatus @default(CREATED)
  provider        String
  providerRef     String?             @map("provider_ref")
  qrPayloadJson   Json?               @map("qr_payload_json")
  createdByUserId String              @map("created_by_user_id") @db.Uuid
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")
  tenant          Tenant              @relation(fields: [tenantId], references: [id])
  contract        Contract            @relation(fields: [contractId], references: [id])
  createdBy       User                @relation(fields: [createdByUserId], references: [id])
  transaction     PaymentTransaction?

  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, contractId])
  @@map("payment_intents")
}

model PaymentTransaction {
  id              String                    @id @default(uuid()) @db.Uuid
  tenantId        String                    @map("tenant_id") @db.Uuid
  paymentIntentId String                    @unique @map("payment_intent_id") @db.Uuid
  providerEventId String                    @unique @map("provider_event_id")
  amount          Decimal                   @db.Decimal(18, 2)
  status          PaymentTransactionStatus
  rawEventJson    Json                      @map("raw_event_json")
  verifiedAt      DateTime                  @map("verified_at")
  createdAt       DateTime                  @default(now()) @map("created_at")
  tenant          Tenant                    @relation(fields: [tenantId], references: [id])
  paymentIntent   PaymentIntent             @relation(fields: [paymentIntentId], references: [id])
  allocations     Allocation[]
  ledgerEntries   LedgerEntry[]

  @@index([tenantId])
  @@map("payment_transactions")
}

model Allocation {
  id                   String             @id @default(uuid()) @db.Uuid
  tenantId             String             @map("tenant_id") @db.Uuid
  paymentTransactionId String             @map("payment_transaction_id") @db.Uuid
  scheduleItemId       String             @map("schedule_item_id") @db.Uuid
  amount               Decimal            @db.Decimal(18, 2)
  createdAt            DateTime           @default(now()) @map("created_at")
  tenant               Tenant             @relation(fields: [tenantId], references: [id])
  paymentTransaction   PaymentTransaction @relation(fields: [paymentTransactionId], references: [id])
  scheduleItem         PaymentScheduleItem @relation(fields: [scheduleItemId], references: [id])

  @@unique([paymentTransactionId, scheduleItemId])
  @@index([tenantId, scheduleItemId])
  @@map("allocations")
}

model LedgerEntry {
  id                   String             @id @default(uuid()) @db.Uuid
  tenantId             String             @map("tenant_id") @db.Uuid
  paymentTransactionId String             @map("payment_transaction_id") @db.Uuid
  domain               LedgerDomain
  direction            LedgerDirection
  accountCode          String             @map("account_code")
  amount               Decimal            @db.Decimal(18, 2)
  createdAt            DateTime           @default(now()) @map("created_at")
  tenant               Tenant             @relation(fields: [tenantId], references: [id])
  paymentTransaction   PaymentTransaction @relation(fields: [paymentTransactionId], references: [id])

  @@index([tenantId, paymentTransactionId])
  @@map("ledger_entries")
}
```

Extend `Tenant`, `User`, `Contract` reverse relations.

- [ ] **Step 1: Schema + relations**

- [ ] **Step 2: Migrate**

```bash
cd backend && set -a && source ../.env && set +a && corepack pnpm exec prisma migrate dev --name r1e_payment_allocate
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma
git commit -m "$(cat <<'EOF'
feat: add Prisma schema for payment intents and allocations

EOF
)"
```

---

### Task 2: FIFO allocate pure function (TDD)

**Files:**
- Create: `backend/src/common/payments/allocate-fifo.ts`
- Create: `backend/src/common/payments/allocate-fifo.spec.ts`

**Interface:**

```typescript
export type ScheduleOutstanding = {
  id: string;
  seq: number;
  totalDue: string;
  amountPaid: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
};

export type AllocationApply = {
  scheduleItemId: string;
  seq: number;
  amount: string;
  nextAmountPaid: string;
  nextStatus: 'PARTIAL' | 'PAID';
};

export function allocateFifo(
  items: ScheduleOutstanding[],
  paymentAmount: string,
): AllocationApply[];
```

**Rules:**
1. Ignore items with `status === 'PAID'` or outstanding `<= 0`.
2. Sort by `seq` ascending.
3. Apply `min(remaining, outstanding)` using `Prisma.Decimal` + half-up only when needed for display; prefer exact decimal ops without float.
4. Throw if `paymentAmount <= 0`.
5. Throw if after applying all items `remaining > 0` (over-allocation vs outstanding).

**Tests:**
- Pay exact one installment → one PAID apply
- Pay across two installments with partial on second
- Overpay beyond outstanding → throw
- Already PAID items skipped

- [ ] **Step 1: Failing tests**

- [ ] **Step 2: Implement**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add FIFO multi-installment allocation helper

EOF
)"
```

---

### Task 3: PaymentGatewayPort + Sandbox adapter

**Files:**
- Create: `backend/src/common/payments/payment-gateway.port.ts`
- Create: `backend/src/common/payments/sandbox-payment.adapter.ts`
- Create: `backend/src/common/payments/sandbox-payment.adapter.spec.ts`
- Create: `backend/src/common/payments/payments-gateway.module.ts`
- Modify: `backend/src/config/env.validation.ts`, `.env.example`, `.github/workflows/ci.yml`

**Port token:** `PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')`

**Sandbox behavior:**
- `createPromptPayIntent` returns `{ provider:'sandbox', providerRef: 'sandbox_'+intentId, qrPayload:{ type:'promptpay', amount, currency:'THB' } }`
- `verifyWebhookSignature`: header `x-mip-signature` = hex HMAC-SHA256(rawBody, PAYMENT_WEBHOOK_SECRET); use `crypto.timingSafeEqual`
- `parseWebhookEvent`: JSON `{ providerEventId, providerRef, amount, status }`
- Export test helper `signSandboxWebhook(rawBody: Buffer, secret: string): string`

Env validation:

```typescript
PAYMENT_WEBHOOK_SECRET: Joi.string().min(32).required(),
PAYMENT_PROVIDER: Joi.string().valid('sandbox').default('sandbox'),
```

- [ ] **Step 1: Failing signature tests**

- [ ] **Step 2: Implement + wire ConfigModule factory (sandbox only; throw if provider not sandbox)**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add sandbox payment gateway port and HMAC verify

EOF
)"
```

---

### Task 4: Create payment intent + get

**Files:**
- Create: `backend/src/payments/**` (service/controller/module/dto)
- Modify: `backend/src/app.module.ts`

**`createIntent(ctx, contractId, amount, idempotencyKey)`:**
1. OWNER/STAFF + tenant
2. Contract ACTIVE else 409/404
3. If idempotency hit → return existing
4. Compute outstanding from schedule items; amount must be `>0` and `<= outstanding` else UnprocessableEntityException (422)
5. Create intent row then call gateway (or call gateway then create — prefer create after gateway success with provider fields in one create)
6. Status `AWAITING_PROVIDER`

**Routes:**
```text
POST /api/v1/contracts/:id/payment-intents   # reads Idempotency-Key header
GET  /api/v1/payment-intents/:id
```

- [ ] **Step 1: Failing unit tests** (no key; overpay; idempotent reuse; happy path)

- [ ] **Step 2: Implement**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add staff payment intent create and get APIs

EOF
)"
```

---

### Task 5: Webhook verify + allocate + ledger

**Files:**
- Modify: `backend/src/payments/payments.service.ts`
- Create: `backend/src/payments/webhooks.controller.ts`
- Modify: `backend/src/payments/payments.service.spec.ts`
- Ensure raw body available for HMAC (Nest middleware/`req.rawBody` pattern — add minimal raw body capture for webhook route only)

**`handleSandboxWebhook(rawBody, headers)`:**
1. verify signature else UnauthorizedException
2. parse event; if FAILED → mark intent failed (optional minimal) without allocate
3. If providerEventId exists → return stored transaction summary
4. `$transaction`:
   - Load intent by providerRef / intent id mapping (sandbox providerRef embeds intent id)
   - Require intent AWAITING_PROVIDER and amount match
   - Create PaymentTransaction
   - `allocateFifo` + update schedule items + Allocation rows
   - Two LedgerEntry rows
   - Intent SUCCEEDED
5. No device calls

**Route:** `POST /api/v1/webhooks/payments/sandbox`

- [ ] **Step 1: Failing tests** (bad sig; replay; multi-item allocate)

- [ ] **Step 2: Implement**

- [ ] **Step 3: Full unit suite green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: verify sandbox payment webhooks and allocate FIFO

EOF
)"
```

---

### Task 6: E2E payment idempotency + isolation

**Files:**
- Create: `backend/test/payments.e2e-spec.ts`
- Update e2e cleanups for payment/allocation/ledger tables
- Ensure test env has `PAYMENT_WEBHOOK_SECRET`

**Flow:**
1. Register A/B; A builds ACTIVE contract with ≥2 schedule items (reuse prior e2e chain)
2. A creates intent with Idempotency-Key for amount spanning 1.5 installments (or first full + partial)
3. Reuse same Idempotency-Key → same intent id
4. POST signed sandbox webhook → items PARTIAL/PAID; allocations created
5. Replay webhook → no extra allocations/ledger rows
6. Bad signature → 401; no money movement
7. B GET intent → 404
8. Cleanup payment tables before contracts

- [ ] **Step 1: Write e2e**

- [ ] **Step 2: `corepack pnpm --filter @mip/backend test:e2e` PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
test: add payment webhook allocation e2e isolation and idempotency

EOF
)"
```

---

### Task 7: Docs status + R1e exit

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`
- Modify: `docs/project-management/CHANGELOG.md`

- [ ] **Step 1: Mark R1e complete; next = R1f Merchant Web + Customer Android critical paths**

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: mark R1e payment allocate slice complete and point to R1f

EOF
)"
```

---

## R1e Exit Criteria

- [ ] Schema + amountPaid/PARTIAL/PAID  
- [ ] FIFO allocate unit tests  
- [ ] Sandbox gateway HMAC  
- [ ] Staff idempotent intent create  
- [ ] Webhook allocate + ledger; replay safe  
- [ ] Cross-tenant e2e denial  
- [ ] No Omise live / refund / UI / device unlock claimed  

## Spec Coverage

| Spec item | Task |
|-----------|------|
| Prisma entities | 1 |
| FIFO allocate | 2 |
| Gateway port + sandbox | 3 |
| Create/get intent | 4 |
| Webhook + ledger | 5 |
| E2E | 6 |
| Docs | 7 |
