# R1b Customer + KYC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver tenant-scoped customer registration with encrypted national ID, KYC cases/documents, sandbox OCR via port, and staff review APIs on NestJS.

**Architecture:** Add `customers` and `kyc` Nest modules plus `common/crypto`, `common/storage`, and `common/ocr` ports. Persist via Prisma; never store plain national IDs; never trust client `tenantId`. OCR and object storage are swappable adapters (sandbox/local first).

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest, Node `crypto` (AES-256-GCM + HMAC-SHA256), existing JwtAuthGuard / CurrentUser, pnpm (`corepack pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-12-r1b-customer-kyc-design.md`
- Phone unique per tenant: `@@unique([tenantId, phone])`
- National ID: encrypt at rest + HMAC hash for lookup; never plain in DB/API lists/logs
- OCR: `OcrProviderPort` + Sandbox adapter only (production BLOCKED)
- Storage: `ObjectStoragePort` + local filesystem adapter under `storage/kyc/` (gitignored)
- TypeScript strict; JWT tenant only; Postgres host port **5433**
- Backend API only — no Flutter/Merchant Web
- TDD for crypto + KYC transitions; frequent commits
- Add env `NATIONAL_ID_ENCRYPTION_KEY` (32+ byte secret) and `KYC_STORAGE_ROOT` to `.env.example`

## File Structure

```text
backend/prisma/schema.prisma
backend/src/common/crypto/national-id.crypto.ts
backend/src/common/crypto/national-id.crypto.spec.ts
backend/src/common/storage/object-storage.port.ts
backend/src/common/storage/local-object-storage.adapter.ts
backend/src/common/ocr/ocr-provider.port.ts
backend/src/common/ocr/sandbox-ocr.adapter.ts
backend/src/customers/
backend/src/kyc/
backend/test/customer-kyc.e2e-spec.ts
.env.example
.gitignore                          # storage/kyc
docs/roadmap/CURRENT-PHASE.md
docs/project-management/PROJECT-STATUS.md
docs/project-management/CHANGELOG.md
```

---

### Task 1: Prisma schema for Customer + KYC

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration `r1b_customer_kyc`

**Interfaces:**
- Produces models: `Customer`, `KycCase`, `KycDocument`, `Consent`, `KycReviewAction` + enums per spec

- [ ] **Step 1: Append enums/models** (extend `Tenant` / `User` relations)

```prisma
enum CustomerStatus {
  ACTIVE
  DISABLED
}

enum KycCaseStatus {
  DRAFT
  SUBMITTED
  IN_REVIEW
  APPROVED
  REJECTED
  NEEDS_RESUBMIT
}

enum KycDocumentType {
  ID_FRONT
  ID_BACK
  SELFIE
  OTHER
}

enum ConsentType {
  PDPA_PROCESSING
  MARKETING
}

enum KycReviewDecision {
  APPROVE
  REJECT
  REQUEST_RESUBMIT
}

model Customer {
  id                  String         @id @default(uuid()) @db.Uuid
  tenantId            String         @map("tenant_id") @db.Uuid
  fullName            String         @map("full_name")
  phone               String
  nationalIdEncrypted String         @map("national_id_encrypted")
  nationalIdHash      String         @map("national_id_hash")
  status              CustomerStatus @default(ACTIVE)
  createdAt           DateTime       @default(now()) @map("created_at")
  updatedAt           DateTime       @updatedAt @map("updated_at")
  tenant              Tenant         @relation(fields: [tenantId], references: [id])
  kycCases            KycCase[]
  consents            Consent[]

  @@unique([tenantId, phone])
  @@index([tenantId, nationalIdHash])
  @@map("customers")
}

model KycCase {
  id             String        @id @default(uuid()) @db.Uuid
  tenantId       String        @map("tenant_id") @db.Uuid
  customerId     String        @map("customer_id") @db.Uuid
  status         KycCaseStatus @default(DRAFT)
  ocrProvider    String?       @map("ocr_provider")
  ocrSummaryJson Json?         @map("ocr_summary_json")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  tenant         Tenant        @relation(fields: [tenantId], references: [id])
  customer       Customer      @relation(fields: [customerId], references: [id])
  documents      KycDocument[]
  reviewActions  KycReviewAction[]

  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@map("kyc_cases")
}

model KycDocument {
  id               String          @id @default(uuid()) @db.Uuid
  tenantId         String          @map("tenant_id") @db.Uuid
  kycCaseId        String          @map("kyc_case_id") @db.Uuid
  type             KycDocumentType
  storageKey       String          @map("storage_key")
  mimeType         String          @map("mime_type")
  checksum         String?
  uploadedByUserId String          @map("uploaded_by_user_id") @db.Uuid
  createdAt        DateTime        @default(now()) @map("created_at")
  tenant           Tenant          @relation(fields: [tenantId], references: [id])
  kycCase          KycCase         @relation(fields: [kycCaseId], references: [id])
  uploadedBy       User            @relation(fields: [uploadedByUserId], references: [id])

  @@index([tenantId, kycCaseId])
  @@map("kyc_documents")
}

model Consent {
  id         String      @id @default(uuid()) @db.Uuid
  tenantId   String      @map("tenant_id") @db.Uuid
  customerId String      @map("customer_id") @db.Uuid
  type       ConsentType
  version    String
  grantedAt  DateTime    @map("granted_at")
  revokedAt  DateTime?   @map("revoked_at")
  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  customer   Customer    @relation(fields: [customerId], references: [id])

  @@index([tenantId, customerId])
  @@map("consents")
}

model KycReviewAction {
  id         String            @id @default(uuid()) @db.Uuid
  tenantId   String            @map("tenant_id") @db.Uuid
  kycCaseId  String            @map("kyc_case_id") @db.Uuid
  actorUserId String           @map("actor_user_id") @db.Uuid
  decision   KycReviewDecision
  reason     String?
  createdAt  DateTime          @default(now()) @map("created_at")
  tenant     Tenant            @relation(fields: [tenantId], references: [id])
  kycCase    KycCase           @relation(fields: [kycCaseId], references: [id])
  actor      User              @relation(fields: [actorUserId], references: [id])

  @@index([tenantId, kycCaseId])
  @@map("kyc_review_actions")
}
```

- [ ] **Step 2: Migrate**

```bash
set -a && source .env && set +a
corepack pnpm --filter @mip/backend exec prisma migrate dev --name r1b_customer_kyc
corepack pnpm --filter @mip/backend exec prisma generate
corepack pnpm --filter @mip/backend typecheck
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma
git commit -m "$(cat <<'EOF'
feat: add Prisma schema for customers and KYC

EOF
)"
```

---

### Task 2: National ID crypto helper (TDD)

**Files:**
- Create: `backend/src/common/crypto/national-id.crypto.ts`
- Create: `backend/src/common/crypto/national-id.crypto.spec.ts`
- Modify: `backend/src/config/env.validation.ts`
- Modify: `.env.example`

**Interfaces:**
- `NationalIdCrypto.encrypt(plain: string): string` — AES-256-GCM, output `iv:tag:ciphertext` base64url or colon-separated base64
- `NationalIdCrypto.hash(plain: string): string` — HMAC-SHA256 hex with same key material derived for hashing (`createHmac('sha256', key)`)
- `NationalIdCrypto.mask(plainOrLast4: string): string` — for API display use last 4 only from hash path: prefer returning `****` + last4 only if caller passes last4 separately; **API must never decrypt for list** — store optional `nationalIdLast4` on Customer OR derive last4 at create time into a non-sensitive column

**Add column in Task 1 if not present:** `nationalIdLast4 String @map("national_id_last4")` — if Task 1 already migrated without it, add a follow-up tiny migration in this task.

- [ ] **Step 1: Failing tests**

```typescript
describe('NationalIdCrypto', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  // process.env.NATIONAL_ID_ENCRYPTION_KEY = key in beforeAll

  it('encrypts and decrypts round-trip', () => {
    const c = new NationalIdCrypto(key);
    const enc = c.encrypt('1234567890123');
    expect(enc).not.toContain('1234567890123');
    expect(c.decrypt(enc)).toBe('1234567890123');
  });

  it('hash is stable and not reversible to plain', () => {
    const c = new NationalIdCrypto(key);
    expect(c.hash('1234567890123')).toBe(c.hash('1234567890123'));
    expect(c.hash('1234567890123')).not.toBe('1234567890123');
  });
});
```

- [ ] **Step 2: Implement + add env validation**

```typescript
// env.validation.ts add:
NATIONAL_ID_ENCRYPTION_KEY: Joi.string().min(32).required(),
KYC_STORAGE_ROOT: Joi.string().default('./storage/kyc'),
OCR_PROVIDER: Joi.string().valid('sandbox').default('sandbox'),
```

- [ ] **Step 3: Tests pass + commit**

```bash
corepack pnpm --filter @mip/backend test -- national-id.crypto.spec.ts
git add backend/src/common/crypto backend/src/config/env.validation.ts .env.example
git commit -m "$(cat <<'EOF'
feat: add national ID encrypt and hash helpers

EOF
)"
```

Update local `.env` with a 32+ char key (do not commit `.env`).

---

### Task 3: Object storage + OCR ports

**Files:**
- Create: `backend/src/common/storage/object-storage.port.ts`
- Create: `backend/src/common/storage/local-object-storage.adapter.ts`
- Create: `backend/src/common/ocr/ocr-provider.port.ts`
- Create: `backend/src/common/ocr/sandbox-ocr.adapter.ts`
- Create: `backend/src/common/ocr/ocr.module.ts`
- Create: `backend/src/common/storage/storage.module.ts`
- Modify: `.gitignore` add `/storage/`

**Interfaces:**

```typescript
export interface ObjectStoragePort {
  putObject(key: string, body: Buffer, mimeType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface OcrAnalyzeInput {
  documentTypes: string[];
  // no raw national ID required
}

export interface OcrSandboxResult {
  provider: 'sandbox';
  documentPresent: boolean;
  nameConfidence: number;
  notes: string[];
}

export interface OcrProviderPort {
  analyzeIdDocuments(input: OcrAnalyzeInput): Promise<OcrSandboxResult>;
}

export const OCR_PROVIDER = Symbol('OCR_PROVIDER');
```

Sandbox adapter always returns `{ provider: 'sandbox', documentPresent: true, nameConfidence: 0.92, notes: ['sandbox-ocr'] }`.

- [ ] **Step 1: Implement modules providing tokens**

- [ ] **Step 2: Unit test sandbox OCR returns safe payload**

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/storage backend/src/common/ocr .gitignore
git commit -m "$(cat <<'EOF'
feat: add local storage and sandbox OCR adapters

EOF
)"
```

---

### Task 4: CustomersService create/list (TDD)

**Files:**
- Create: `backend/src/customers/**`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- `create(ctx, { fullName, phone, nationalId, consents? })`
- Encrypt + hash + last4; unique phone → ConflictException
- `list` / `get` return masked `nationalIdMasked: "****" + last4` never encrypted blob to clients unless needed internally
- Forbidden without tenant

- [ ] **Step 1: Failing unit tests** (no tenant; create stores hash≠plain; duplicate phone)

- [ ] **Step 2: Implement service + DTOs + controller routes POST/GET/PATCH**

Routes:

```text
POST /api/v1/customers
GET  /api/v1/customers
GET  /api/v1/customers/:id
PATCH /api/v1/customers/:id
```

- [ ] **Step 3: Tests green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add customer registration with encrypted national ID

EOF
)"
```

---

### Task 5: KYC case, documents, submit, OCR (TDD)

**Files:**
- Create: `backend/src/kyc/**`

**Interfaces:**
- `createCase(ctx, customerId)` → DRAFT (reject if open case exists in DRAFT/SUBMITTED/IN_REVIEW/NEEDS_RESUBMIT)
- `addDocument(ctx, caseId, { type, buffer, mimeType })` → putObject + KycDocument row; only DRAFT/NEEDS_RESUBMIT
- `submit(ctx, caseId)` → SUBMITTED
- `runOcr(ctx, caseId)` → calls OCR port; sets `ocrSummaryJson` (safe); status IN_REVIEW

- [ ] **Step 1: Unit tests for transitions + OCR port mocked/sandbox**

- [ ] **Step 2: Implement + HTTP**

```text
POST /api/v1/customers/:id/kyc-cases
POST /api/v1/kyc-cases/:id/documents   # multipart field "file"
POST /api/v1/kyc-cases/:id/submit
POST /api/v1/kyc-cases/:id/ocr
GET  /api/v1/kyc-cases/:id
```

Use `FileInterceptor('file')` from `@nestjs/platform-express` (add dependency if missing).

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add KYC cases, document upload, and sandbox OCR

EOF
)"
```

---

### Task 6: Staff review + audit (TDD)

**Files:**
- Modify: `backend/src/kyc/kyc.service.ts`
- Modify: `backend/src/kyc/kyc.controller.ts`

**Interfaces:**
- `review(ctx, caseId, { decision, reason? })`
- Only from `IN_REVIEW`
- APPROVE → APPROVED; REJECT → REJECTED; REQUEST_RESUBMIT → NEEDS_RESUBMIT
- Append `KycReviewAction`
- Allow `MERCHANT_OWNER` and `MERCHANT_STAFF` (deny SUPER_ADMIN without tenant)

- [ ] **Step 1: Tests for approve/reject/resubmit + illegal status**

- [ ] **Step 2: Implement `POST /api/v1/kyc-cases/:id/review`**

- [ ] **Step 3: Full unit suite green + commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add KYC staff review with audit actions

EOF
)"
```

---

### Task 7: E2E customer + KYC isolation

**Files:**
- Create: `backend/test/customer-kyc.e2e-spec.ts`

**Flow:**
1. Register owners A and B  
2. A creates customer + KYC + upload tiny PNG buffer + submit + OCR + approve  
3. B cannot GET A’s customer/case (404)  
4. Duplicate phone on A → 409  
5. Cleanup scoped to created tenant ids (include customers/kyc tables)

- [ ] **Step 1: Write e2e**

- [ ] **Step 2: `corepack pnpm --filter @mip/backend test:e2e` PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
test: add customer KYC e2e isolation and review flow

EOF
)"
```

---

### Task 8: Docs status + R1b exit

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/PROJECT-STATUS.md`
- Modify: `docs/project-management/CHANGELOG.md`
- Ensure spec+plan committed if not already

- [ ] **Step 1: Mark R1b complete; next = R1c Application + Scorecard**

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: mark R1b customer KYC slice complete and point to R1c

EOF
)"
```

---

## R1b Exit Criteria

- [ ] Schema migrated  
- [ ] Customer create with encrypted ID + unique phone  
- [ ] KYC documents stored via port  
- [ ] Sandbox OCR via port  
- [ ] Staff review audited  
- [ ] Cross-tenant e2e denial  
- [ ] No UI claimed done; production OCR still BLOCKED  

## Spec Coverage

| Spec item | Task |
|-----------|------|
| Prisma entities | 1 (+ last4 if needed in 2) |
| National ID crypto | 2 |
| Storage + OCR ports | 3 |
| Customers API | 4 |
| KYC docs/submit/OCR | 5 |
| Review audit | 6 |
| E2E isolation | 7 |
| Docs | 8 |
