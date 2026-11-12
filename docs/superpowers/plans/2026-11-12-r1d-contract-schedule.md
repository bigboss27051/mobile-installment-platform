# R1d Contract + Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver tenant-scoped contracts with versioned flat/reducing repayment schedules and atomic activate (IMEI SOLD) from APPROVED applications.

**Architecture:** Pure `common/schedule` engine (`r1d-v1`) computes Decimal-safe schedules + hash. Nest `contracts` module creates DRAFT contracts (version + items) from R1c APPROVED applications, then activates with status-guarded updates and in-transaction IMEI SELL (same pattern as R1c atomic release).

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest, Prisma.Decimal, Node `crypto` (SHA-256), existing JwtAuthGuard / TenantContext, pnpm (`corepack pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1d-contract-schedule-design.md`
- Decisions: D-028…D-031
- Money: `DECIMAL(18,2)` / `Prisma.Decimal` only — no float
- JWT tenant only; Postgres host port **5433**
- Backend API only — no UI / e-sign / payments
- TDD for schedule math + contract transitions; frequent commits
- OWNER/STAFF for mutate; race-safe `updateMany`; no post-commit `markSold`

## File Structure

```text
backend/prisma/schema.prisma
backend/src/common/schedule/money.ts
backend/src/common/schedule/schedule.ts
backend/src/common/schedule/schedule.spec.ts
backend/src/contracts/contracts.module.ts
backend/src/contracts/contracts.service.ts
backend/src/contracts/contracts.service.spec.ts
backend/src/contracts/contracts.controller.ts
backend/src/contracts/dto/*.ts
backend/src/app.module.ts
backend/test/contract-schedule.e2e-spec.ts
docs/roadmap/CURRENT-PHASE.md
docs/project-management/PROJECT-STATUS.md
docs/project-management/CHANGELOG.md
```

---

### Task 1: Prisma schema for Contract + Schedule

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration `r1d_contract_schedule`

**Enums/models:**

```prisma
enum ContractStatus {
  DRAFT
  ACTIVE
  CANCELLED
  CLOSED
}

enum ScheduleItemStatus {
  PENDING
}

model Contract {
  id              String           @id @default(uuid()) @db.Uuid
  tenantId        String           @map("tenant_id") @db.Uuid
  applicationId   String           @map("application_id") @db.Uuid
  customerId      String           @map("customer_id") @db.Uuid
  imeiUnitId      String           @map("imei_unit_id") @db.Uuid
  status          ContractStatus   @default(DRAFT)
  principal       Decimal          @db.Decimal(18, 2)
  downPayment     Decimal          @map("down_payment") @db.Decimal(18, 2)
  financedAmount  Decimal          @map("financed_amount") @db.Decimal(18, 2)
  termMonths      Int              @map("term_months")
  interestMethod  InterestMethod   @map("interest_method")
  annualRate      Decimal          @map("annual_rate") @db.Decimal(18, 2)
  currency        String           @default("THB") @db.Char(3)
  activatedAt     DateTime?        @map("activated_at")
  cancelledAt     DateTime?        @map("cancelled_at")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  application     Application      @relation(fields: [applicationId], references: [id])
  customer        Customer         @relation(fields: [customerId], references: [id])
  imeiUnit        ImeiUnit         @relation(fields: [imeiUnitId], references: [id])
  versions        ContractVersion[]
  scheduleItems   PaymentScheduleItem[]

  @@index([tenantId, status])
  @@index([tenantId, applicationId])
  @@map("contracts")
}

model ContractVersion {
  id            String                @id @default(uuid()) @db.Uuid
  tenantId      String                @map("tenant_id") @db.Uuid
  contractId    String                @map("contract_id") @db.Uuid
  version       Int
  termsJson     Json                  @map("terms_json")
  scheduleHash  String                @map("schedule_hash")
  createdAt     DateTime              @default(now()) @map("created_at")
  tenant        Tenant                @relation(fields: [tenantId], references: [id])
  contract      Contract              @relation(fields: [contractId], references: [id])
  scheduleItems PaymentScheduleItem[]

  @@unique([contractId, version])
  @@index([tenantId])
  @@map("contract_versions")
}

model PaymentScheduleItem {
  id                String              @id @default(uuid()) @db.Uuid
  tenantId          String              @map("tenant_id") @db.Uuid
  contractId        String              @map("contract_id") @db.Uuid
  contractVersionId String              @map("contract_version_id") @db.Uuid
  seq               Int
  dueDate           DateTime            @map("due_date") @db.Date
  principalDue      Decimal             @map("principal_due") @db.Decimal(18, 2)
  interestDue       Decimal             @map("interest_due") @db.Decimal(18, 2)
  feesDue           Decimal             @map("fees_due") @db.Decimal(18, 2)
  totalDue          Decimal             @map("total_due") @db.Decimal(18, 2)
  status            ScheduleItemStatus  @default(PENDING)
  tenant            Tenant              @relation(fields: [tenantId], references: [id])
  contract          Contract            @relation(fields: [contractId], references: [id])
  contractVersion   ContractVersion     @relation(fields: [contractVersionId], references: [id])

  @@unique([contractVersionId, seq])
  @@index([tenantId, contractId])
  @@map("payment_schedule_items")
}
```

Add reverse relations on `Tenant`, `Application`, `Customer`, `ImeiUnit`.

Also add SQL in migration (raw):

```sql
CREATE UNIQUE INDEX contracts_open_application_unique
ON contracts (tenant_id, application_id)
WHERE status IN ('DRAFT', 'ACTIVE');
```

- [ ] **Step 1: Append schema + relations**

- [ ] **Step 2: Migrate**

```bash
cd backend && set -a && source ../.env && set +a && corepack pnpm exec prisma migrate dev --name r1d_contract_schedule
```

Expected: migration applied; client generated.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma
git commit -m "$(cat <<'EOF'
feat: add Prisma schema for contracts and schedules

EOF
)"
```

---

### Task 2: Schedule engine `r1d-v1` (TDD)

**Files:**
- Create: `backend/src/common/schedule/money.ts`
- Create: `backend/src/common/schedule/schedule.ts`
- Create: `backend/src/common/schedule/schedule.spec.ts`

**money.ts:**

```typescript
import { Prisma } from '@prisma/client';

export function d(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Round half-up to 2 decimal places (THB satang). */
export function roundHalfUp2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
```

**schedule.ts interface:**

```typescript
export type ScheduleInput = {
  interestMethod: 'FLAT' | 'REDUCING';
  principal: string;
  downPayment: string;
  annualRate: string; // percent e.g. "12.00"
  termMonths: number;
  startDate: string; // YYYY-MM-DD (UTC date of DRAFT create)
};

export type ScheduleItem = {
  seq: number;
  dueDate: string; // YYYY-MM-DD
  principalDue: string;
  interestDue: string;
  feesDue: string; // "0.00"
  totalDue: string;
};

export type ScheduleOutput = {
  version: 'r1d-v1';
  financedAmount: string;
  interestTotal: string;
  items: ScheduleItem[];
  scheduleHash: string;
};

export function generateSchedule(input: ScheduleInput): ScheduleOutput;
export function hashSchedule(payload: unknown): string;
```

**Rules (implement exactly):**

1. `financed = principal - downPayment`; throw if `principal <= 0`, `downPayment < 0`, `downPayment >= principal`, `termMonths < 1`.
2. Due date for seq `i`: calendar add `i` months to `startDate` (use UTC date parts; if day overflows month end, clamp to last day of month).
3. **FLAT:**  
   - `interestTotal = roundHalfUp2(financed * (annualRate/100) * (termMonths/12))`  
   - `baseTotal = roundHalfUp2((financed + interestTotal) / N)` for installments `1..N-1` as `totalDue`  
   - Last `totalDue = (financed + interestTotal) - sum(previous totals)`  
   - Split each installment: `interestDue_i = roundHalfUp2(interestTotal / N)` for `1..N-1`; last interest = remainder; `principalDue = totalDue - interestDue` (adjust last principal to clear financed remainder if needed so sums match).
4. **REDUCING:**  
   - `r = (annualRate/100)/12`  
   - `PMT = roundHalfUp2(financed * r * (1+r)^N / ((1+r)^N - 1))` when `r > 0`; if `r = 0`, `PMT = roundHalfUp2(financed / N)`  
   - Periods `1..N-1`: `interest = roundHalfUp2(remaining * r)`; `principal = PMT - interest`; if `principal > remaining` clamp; `remaining -= principal`; `totalDue = principal + interest`  
   - Final: `interest = roundHalfUp2(remaining * r)`; `principal = remaining`; `totalDue = principal + interest`  
   - `interestTotal = sum(interestDue)`
5. `feesDue` always `"0.00"`.
6. `scheduleHash = sha256(JSON.stringify(canonical))` where canonical is sorted keys object:  
   `{ version:"r1d-v1", interestMethod, financedAmount, annualRate, termMonths, items:[{seq,dueDate,principalDue,interestDue,feesDue,totalDue}] }`  
   Use stable decimal strings with 2dp.

**Golden fixture (must pass):**

```typescript
// FLAT: financed 10000, rate 12%, term 6, start 2026-01-15
// interestTotal = 600.00; first totals 1766.67; verify sum totals 10600.00; sum principal 10000.00
generateSchedule({
  interestMethod: 'FLAT',
  principal: '12000.00',
  downPayment: '2000.00',
  annualRate: '12.00',
  termMonths: 6,
  startDate: '2026-01-15',
});
```

Also add one REDUCING golden with `principal 11000`, `downPayment 1000`, `rate 18`, `term 12`, `startDate 2026-01-01` — assert sum(principalDue)=financed, all values 2dp, hash stable across two calls.

- [ ] **Step 1: Write failing tests** (invalid money; flat golden; reducing totals; hash stability)

- [ ] **Step 2: Run** `corepack pnpm --filter @mip/backend test -- schedule.spec.ts` — expect FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add r1d-v1 flat and reducing schedule engine

EOF
)"
```

---

### Task 3: Create DRAFT contract + list/get

**Files:**
- Create: `backend/src/contracts/**`
- Modify: `backend/src/app.module.ts`

**`createFromApplication(ctx, applicationId)`:**

1. Require tenant OWNER/STAFF (or allow any authenticated tenant member for create — match applications: any tenant member; activate/cancel OWNER/STAFF only — **use OWNER/STAFF for all contract mutates** for consistency with D-027 style)
2. Load application `APPROVED` + tenant scope else 404/409  
3. Ensure IMEI still `RESERVED` else 409  
4. Reject if open contract exists (DRAFT/ACTIVE) for application → 409 (also rely on partial unique + P2002 map)  
5. `financed = principal - downPayment`  
6. `generateSchedule(...)` with `startDate = today UTC YYYY-MM-DD`  
7. Transaction: create Contract DRAFT + ContractVersion v1 + PaymentScheduleItem rows  
8. Return contract with version + items; money as strings

**Routes:**

```text
POST /api/v1/applications/:id/contracts
GET  /api/v1/contracts
GET  /api/v1/contracts/:id
```

- [ ] **Step 1: Failing unit tests** (non-approved; create DRAFT; duplicate open)

- [ ] **Step 2: Implement module/service/controller/DTOs**

- [ ] **Step 3: Tests green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: create draft contracts with versioned schedules

EOF
)"
```

---

### Task 4: Activate + cancel (atomic SOLD)

**Files:**
- Modify: `backend/src/contracts/contracts.service.ts`
- Modify: `backend/src/contracts/contracts.service.spec.ts`
- Modify: `backend/src/contracts/contracts.controller.ts`

**`activate(ctx, contractId)`:**

- OWNER/STAFF only  
- In `$transaction`:  
  1. `contract.updateMany` where `{ id, tenantId, status: DRAFT }` → `ACTIVE`, set `activatedAt`; if count=0 → Conflict  
  2. `imeiUnit.updateMany` where `{ id: imeiUnitId, tenantId, status: RESERVED }` → `SOLD`; if count=0 → Conflict (rollback)  
  3. `stockMovement.create` type `SELL`, reason `contract:${id}:activated`  
- Return updated contract

**`cancel(ctx, contractId)`:**

- OWNER/STAFF  
- `updateMany` DRAFT→CANCELLED + `cancelledAt`; count=0 → Conflict  
- **No** IMEI change

**Routes:**

```text
POST /api/v1/contracts/:id/activate
POST /api/v1/contracts/:id/cancel
```

- [ ] **Step 1: Failing tests** — activate SOLD; race count 0; cancel DRAFT; cancel ACTIVE rejected; no release on cancel

- [ ] **Step 2: Implement**

- [ ] **Step 3: Full unit suite green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: activate contracts with atomic IMEI sold and cancel draft

EOF
)"
```

---

### Task 5: E2E contract + schedule isolation

**Files:**
- Create: `backend/test/contract-schedule.e2e-spec.ts`
- Update other e2e cleanups to delete contracts/schedule/versions before applications if needed

**Flow:**

1. Register A/B  
2. A: inventory receive IMEI; customer; KYC APPROVED; application submit+approve  
3. A: POST contract DRAFT; assert schedule items + hash  
4. A: activate → IMEI SOLD; contract ACTIVE  
5. B GET contract → 404  
6. Optional second path: DRAFT then cancel → IMEI still RESERVED  
7. Cleanup: schedule items, versions, contracts, then existing application/kyc/inventory/tenant tables

- [ ] **Step 1: Write e2e**

- [ ] **Step 2: `corepack pnpm --filter @mip/backend test:e2e` PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
test: add contract schedule e2e isolation and activate flow

EOF
)"
```

---

### Task 6: Docs status + R1d exit

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`
- Modify: `docs/project-management/CHANGELOG.md`

- [ ] **Step 1: Mark R1d complete; next = R1e Payment verify + allocate**

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: mark R1d contract schedule slice complete and point to R1e

EOF
)"
```

---

## R1d Exit Criteria

- [ ] Schema migrated + open-application partial unique  
- [ ] Flat + reducing golden schedule tests  
- [ ] DRAFT create from APPROVED application  
- [ ] Activate atomic ACTIVE + IMEI SOLD  
- [ ] Cancel DRAFT without IMEI change  
- [ ] Cross-tenant e2e denial  
- [ ] No e-sign / payment / UI claimed  

## Spec Coverage

| Spec item | Task |
|-----------|------|
| Prisma entities + partial unique | 1 |
| Schedule engine r1d-v1 | 2 |
| Create DRAFT + list/get | 3 |
| Activate/cancel atomic | 4 |
| E2E isolation | 5 |
| Docs | 6 |
