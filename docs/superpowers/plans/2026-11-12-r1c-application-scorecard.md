# R1c Application + Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver tenant-scoped installment applications with seeded plans, advisory scorecard on submit, IMEI reserve/release, and auditable approve/reject decisions.

**Architecture:** Add `plans` (read-only list + seed on register-owner) and `applications` Nest modules plus a pure `scorecard` function. Persist via Prisma with DECIMAL money. Reuse `InventoryService.reserve` / `release`. Gate submit on KYC `APPROVED`. No Plan CRUD UI/API beyond list.

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest, Prisma.Decimal, existing JwtAuthGuard / CurrentUser / TenantContext, pnpm (`corepack pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1c-application-scorecard-design.md`
- Decisions: D-024…D-027
- Money: `DECIMAL(18,2)` / `Prisma.Decimal` only — no float
- JWT tenant only; Postgres host port **5433**
- Backend API only — no Flutter/Merchant Web
- TDD for scorecard + application transitions; frequent commits
- Full RBAC / CREDIT_OFFICER deferred (OWNER/STAFF for decisions)

## File Structure

```text
backend/prisma/schema.prisma
backend/src/common/scorecard/scorecard.ts
backend/src/common/scorecard/scorecard.spec.ts
backend/src/plans/plans.module.ts
backend/src/plans/plans.service.ts
backend/src/plans/plans.controller.ts
backend/src/applications/applications.module.ts
backend/src/applications/applications.service.ts
backend/src/applications/applications.service.spec.ts
backend/src/applications/applications.controller.ts
backend/src/applications/dto/*.ts
backend/src/tenants/tenants.service.ts          # seed plans
backend/src/app.module.ts
backend/test/application-scorecard.e2e-spec.ts
docs/roadmap/CURRENT-PHASE.md
docs/project-management/PROJECT-STATUS.md
docs/project-management/CHANGELOG.md
```

---

### Task 1: Prisma schema for Plan + Application + Scorecard + Approval

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration `r1c_application_scorecard`

**Enums/models to add:**

```prisma
enum InterestMethod {
  FLAT
  REDUCING
}

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  CANCELLED
}

enum ScorecardBand {
  LOW
  MEDIUM
  HIGH
}

enum ApplicationDecision {
  APPROVE
  REJECT
}

model InstallmentPlan {
  id             String          @id @default(uuid()) @db.Uuid
  tenantId       String          @map("tenant_id") @db.Uuid
  code           String
  name           String
  interestMethod InterestMethod  @map("interest_method")
  annualRate     Decimal         @map("annual_rate") @db.Decimal(18, 2)
  termMonths     Int             @map("term_months")
  feesJson       Json?           @map("fees_json")
  active         Boolean         @default(true)
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  applications   Application[]

  @@unique([tenantId, code])
  @@index([tenantId, active])
  @@map("installment_plans")
}

model Application {
  id             String            @id @default(uuid()) @db.Uuid
  tenantId       String            @map("tenant_id") @db.Uuid
  customerId     String            @map("customer_id") @db.Uuid
  imeiUnitId     String            @map("imei_unit_id") @db.Uuid
  planId         String            @map("plan_id") @db.Uuid
  principal      Decimal           @db.Decimal(18, 2)
  downPayment    Decimal           @map("down_payment") @db.Decimal(18, 2)
  termMonths     Int               @map("term_months")
  interestMethod InterestMethod    @map("interest_method")
  annualRate     Decimal           @map("annual_rate") @db.Decimal(18, 2)
  status         ApplicationStatus @default(DRAFT)
  submittedAt    DateTime?         @map("submitted_at")
  decidedAt      DateTime?         @map("decided_at")
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")
  tenant         Tenant            @relation(fields: [tenantId], references: [id])
  customer       Customer          @relation(fields: [customerId], references: [id])
  imeiUnit       ImeiUnit          @relation(fields: [imeiUnitId], references: [id])
  plan           InstallmentPlan   @relation(fields: [planId], references: [id])
  scorecard      ScorecardResult?
  approvalActions ApprovalAction[]

  @@index([tenantId, status])
  @@index([tenantId, customerId])
  @@index([tenantId, imeiUnitId])
  @@map("applications")
}

model ScorecardResult {
  id            String        @id @default(uuid()) @db.Uuid
  tenantId      String        @map("tenant_id") @db.Uuid
  applicationId String        @unique @map("application_id") @db.Uuid
  score         Int
  band          ScorecardBand
  reasonsJson   Json          @map("reasons_json")
  version       String
  createdAt     DateTime      @default(now()) @map("created_at")
  tenant        Tenant        @relation(fields: [tenantId], references: [id])
  application   Application   @relation(fields: [applicationId], references: [id])

  @@index([tenantId])
  @@map("scorecard_results")
}

model ApprovalAction {
  id            String              @id @default(uuid()) @db.Uuid
  tenantId      String              @map("tenant_id") @db.Uuid
  applicationId String              @map("application_id") @db.Uuid
  actorUserId   String              @map("actor_user_id") @db.Uuid
  decision      ApplicationDecision
  reason        String?
  createdAt     DateTime            @default(now()) @map("created_at")
  tenant        Tenant              @relation(fields: [tenantId], references: [id])
  application   Application         @relation(fields: [applicationId], references: [id])
  actor         User                @relation(fields: [actorUserId], references: [id])

  @@index([tenantId, applicationId])
  @@map("approval_actions")
}
```

Also extend `Tenant`, `User`, `Customer`, `ImeiUnit` with reverse relations.

- [ ] **Step 1: Append schema + relations**

- [ ] **Step 2: Migrate**

```bash
cd backend && corepack pnpm exec prisma migrate dev --name r1c_application_scorecard
```

Expected: migration applied; client generated.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma
git commit -m "$(cat <<'EOF'
feat: add Prisma schema for applications and scorecard

EOF
)"
```

---

### Task 2: Seed installment plans + read-only list API

**Files:**
- Modify: `backend/src/tenants/tenants.service.ts`
- Modify: `backend/src/tenants/tenants.service.spec.ts` (assert 2 plans created)
- Create: `backend/src/plans/plans.service.ts`
- Create: `backend/src/plans/plans.controller.ts`
- Create: `backend/src/plans/plans.module.ts`
- Modify: `backend/src/app.module.ts`

**Seed defaults inside `createTenantWithOwner` transaction** (after user create):

```typescript
await tx.installmentPlan.createMany({
  data: [
    {
      tenantId: tenant.id,
      code: 'FLAT-6',
      name: 'Flat 6 months',
      interestMethod: 'FLAT',
      annualRate: new Prisma.Decimal('12.00'),
      termMonths: 6,
      active: true,
    },
    {
      tenantId: tenant.id,
      code: 'REDUCING-12',
      name: 'Reducing 12 months',
      interestMethod: 'REDUCING',
      annualRate: new Prisma.Decimal('18.00'),
      termMonths: 12,
      active: true,
    },
  ],
});
```

**PlansService.list(ctx):** require tenant; return active plans ordered by `code`.

**Route:** `GET /api/v1/installment-plans`

- [ ] **Step 1: Failing unit test** — register-owner path / tenants service creates 2 plans

- [ ] **Step 2: Implement seed + PlansModule list**

- [ ] **Step 3: Tests green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: seed installment plans and expose read-only list

EOF
)"
```

---

### Task 3: Scorecard pure function (TDD)

**Files:**
- Create: `backend/src/common/scorecard/scorecard.ts`
- Create: `backend/src/common/scorecard/scorecard.spec.ts`

**Interface:**

```typescript
export type ScorecardInput = {
  principal: string; // decimal string
  downPayment: string;
  termMonths: number;
};

export type ScorecardReason = { code: string; message: string };

export type ScorecardOutput = {
  score: number; // 0..100
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: ScorecardReason[];
  version: 'r1c-v1';
};

export function computeScorecard(input: ScorecardInput): ScorecardOutput;
```

**Rules (`r1c-v1`) — implement exactly:**

1. Reject invalid money (`principal <= 0`, `downPayment < 0`, `downPayment > principal`) by throwing `Error` with clear message (service maps to 400).
2. Start score at `40`.
3. Down-payment ratio `r = downPayment/principal`:
   - `r >= 0.30` → +40, reason `DP_STRONG`
   - `0.20 <= r < 0.30` → +25, reason `DP_OK`
   - `0.10 <= r < 0.20` → +10, reason `DP_THIN`
   - `r < 0.10` → +0, reason `DP_WEAK`
4. Term:
   - `termMonths <= 6` → +20, reason `TERM_SHORT`
   - `7..12` → +10, reason `TERM_MEDIUM`
   - `> 12` → +0, reason `TERM_LONG`
5. Clamp score to 0..100.
6. Band: `score >= 70` HIGH; `>= 45` MEDIUM; else LOW.

Use `Prisma.Decimal` or decimal.js-style string math — **no float**.

- [ ] **Step 1: Write failing tests** for strong/ok/weak DP, term bands, clamp, version

- [ ] **Step 2: Run** `corepack pnpm --filter @mip/backend test -- scorecard.spec.ts` — expect FAIL

- [ ] **Step 3: Implement `computeScorecard`**

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add r1c-v1 advisory scorecard pure function

EOF
)"
```

---

### Task 4: Applications create / list / get (DRAFT)

**Files:**
- Create: `backend/src/applications/**`
- Modify: `backend/src/app.module.ts`

**Create input:** `{ customerId, imeiUnitId, planId, principal, downPayment }`  
Copy snapshot `termMonths`, `interestMethod`, `annualRate` from plan.  
Validate: tenant scope; customer exists; plan active; IMEI exists; principal/downPayment decimal strings; `downPayment <= principal`.  
Reject if another open application (`DRAFT`/`SUBMITTED`) exists for same `imeiUnitId` → 409.

**Routes:**

```text
POST /api/v1/applications
GET  /api/v1/applications
GET  /api/v1/applications/:id
```

Response includes money as strings; include `scorecard` when present (null on DRAFT).

- [ ] **Step 1: Failing unit tests** (no tenant; create DRAFT; open IMEI conflict)

- [ ] **Step 2: Implement service + DTOs + controller**

- [ ] **Step 3: Tests green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add application draft create and list APIs

EOF
)"
```

---

### Task 5: Submit — KYC gate + reserve + scorecard

**Files:**
- Modify: `backend/src/applications/applications.service.ts`
- Modify: `backend/src/applications/applications.service.spec.ts`
- Modify: `backend/src/applications/applications.module.ts` (import InventoryModule)
- Modify: `backend/src/applications/applications.controller.ts`

**`submit(ctx, applicationId)`:**

1. Require tenant; load application DRAFT or 409  
2. Ensure customer has ≥1 `KycCase` with status `APPROVED` else 409  
3. Call `inventory.reserve(ctx, imeiUnitId, { reason: \`application:${id}\` })`  
4. If reserve fails, do not flip application status  
5. `computeScorecard(...)` → create `ScorecardResult`  
6. Update application → `SUBMITTED`, set `submittedAt`  
7. Ordering: prefer scorecard+status update after successful reserve; if DB write fails after reserve, call `inventory.release` as compensation and rethrow  

**Route:** `POST /api/v1/applications/:id/submit`

- [ ] **Step 1: Failing tests** — no KYC; reserve called; status SUBMITTED; scorecard persisted

- [ ] **Step 2: Implement submit**

- [ ] **Step 3: Tests green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: submit applications with KYC gate reserve and scorecard

EOF
)"
```

---

### Task 6: Decision + cancel (audit + release)

**Files:**
- Modify: `backend/src/applications/applications.service.ts`
- Modify: `backend/src/applications/applications.service.spec.ts`
- Create: `backend/src/applications/dto/application-decision.dto.ts`

**`decision(ctx, id, { decision, reason? })`:**

- Roles: `MERCHANT_OWNER` | `MERCHANT_STAFF` only else 403  
- Only from `SUBMITTED`  
- Wrap status update + `ApprovalAction` create in `prisma.$transaction`  
- `APPROVE` → `APPROVED` (IMEI stays RESERVED)  
- `REJECT` → `REJECTED` then `inventory.release` (after successful tx)  

**`cancel(ctx, id)`:**

- From `DRAFT` → `CANCELLED` (no release)  
- From `SUBMITTED` → `CANCELLED` + release  
- Else 409  

**Routes:**

```text
POST /api/v1/applications/:id/decision
POST /api/v1/applications/:id/cancel
```

- [ ] **Step 1: Failing tests** — approve/reject/cancel; illegal status; role deny; audit row; reject releases

- [ ] **Step 2: Implement**

- [ ] **Step 3: Full unit suite green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add application decision and cancel with audit

EOF
)"
```

---

### Task 7: E2E application + scorecard isolation

**Files:**
- Create: `backend/test/application-scorecard.e2e-spec.ts`

**Flow:**

1. Register owners A and B (plans auto-seeded)  
2. A: create product/variant/receive IMEI; create customer; complete KYC to APPROVED (reuse KYC HTTP flow from customer-kyc e2e)  
3. A: list plans → create application DRAFT → submit → expect scorecard + IMEI RESERVED → approve  
4. B cannot GET A’s application (404)  
5. Separate path or second IMEI: submit then reject → IMEI AVAILABLE again  
6. Cleanup: approval_actions, scorecard_results, applications, installment_plans, plus existing customer/kyc/inventory/tenant cleanup  

- [ ] **Step 1: Write e2e**

- [ ] **Step 2: `corepack pnpm --filter @mip/backend test:e2e` PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
test: add application scorecard e2e isolation and decision flow

EOF
)"
```

---

### Task 8: Docs status + R1c exit

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`
- Modify: `docs/project-management/CHANGELOG.md`
- Ensure spec+plan committed

- [ ] **Step 1: Mark R1c complete; next = R1d Contract + Schedule**

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: mark R1c application scorecard slice complete and point to R1d

EOF
)"
```

---

## R1c Exit Criteria

- [ ] Schema migrated  
- [ ] Seeded plans listed per tenant  
- [ ] Application draft create/list  
- [ ] Submit: KYC APPROVED gate + IMEI reserve + scorecard `r1c-v1`  
- [ ] Approve/reject audited; reject/cancel release IMEI  
- [ ] Cross-tenant e2e denial  
- [ ] No UI / Plan CRUD / contract / payment claimed  

## Spec Coverage

| Spec item | Task |
|-----------|------|
| Prisma entities | 1 |
| Plan seed + list | 2 |
| Scorecard pure function | 3 |
| Application DRAFT APIs | 4 |
| Submit + reserve + scorecard | 5 |
| Decision/cancel audit | 6 |
| E2E isolation | 7 |
| Docs | 8 |
