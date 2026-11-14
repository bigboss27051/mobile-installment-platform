# Phase 1 Shared Enrollment Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align existing DM1/DM2 enrollment stubs with D-057/D-058: session states `NOT_STARTED` and `QR_GENERATED`, dashboard-ready device fields, and tests — without shipping kiosk lock or claiming Device Owner.

**Architecture:** NestJS Device module remains the only enroll/bind context. Merchant Web wizard already creates sessions; QR materialize must move Android sessions to `QR_GENERATED`. Custom DPC extras (replacing Google Cloud DPC constants in `enrollment-qr.ts`) are **Phase 2**, not this plan.

**Tech Stack:** NestJS, Prisma, Jest e2e, Vite React Merchant Web.

**Do not:** factory-reset phones, implement Lock Task Mode, call AMAPI, or start Phase 5 iOS MDM HTTP.

---

### Files (Phase 1)

- Modify: `backend/prisma/schema.prisma` (`EnrollmentSessionStatus`, `Device` identifiers, `DevicePolicyState` if present)
- Modify: `backend/src/devices/enrollment.service.ts`
- Modify: `backend/src/devices/enrollment.service.spec.ts`
- Modify: `backend/test/enrollment.e2e-spec.ts`
- Modify: `apps/merchant-web/src/enroll-status.ts` (+ spec + i18n)
- Modify: `backend/src/devices/enrollment-qr.ts` only if adding comments; **do not** swap Cloud DPC component until Phase 2

---

### Task 1: Session status enum

**Files:**
- Modify: `backend/prisma/schema.prisma` (`EnrollmentSessionStatus`)
- Test: `backend/src/devices/enrollment.service.spec.ts`

- [x] **Step 1: Write the failing unit expectation**

In `enrollment.service.spec.ts`, add that `materializeQr` persists `status: 'QR_GENERATED'` (it currently only updates `qrFingerprint`). Run:

```bash
cd backend && npx jest src/devices/enrollment.service.spec.ts -t "QR_GENERATED"
```

Expected: FAIL (no such test / status never set).

- [x] **Step 2: Add Prisma enum values**

In `enum EnrollmentSessionStatus` add `NOT_STARTED` and `QR_GENERATED` (keep existing values). Create session still defaults to `WAITING_FOR_DEVICE`.

```prisma
enum EnrollmentSessionStatus {
  NOT_STARTED
  WAITING_FOR_DEVICE
  QR_GENERATED
  PROVISIONING
  ENROLLING
  VERIFYING
  ACTIVATING
  COMPLETED
  FAILED
  EXPIRED
  CANCELLED
  RECOVERY_REQUIRED
}
```

Run: `npx prisma migrate dev --name enrollment_qr_generated_status`

- [x] **Step 3: Include new statuses in OPEN_STATUSES**

`backend/src/devices/enrollment.service.ts` and `device-lifecycle.service.ts` must treat `QR_GENERATED` and `NOT_STARTED` as open (cancel/expire/retry).

- [x] **Step 4: Set status on QR materialize**

In `materializeQr`, after computing `payloadFingerprint`:

```typescript
data: {
  qrFingerprint: payloadFingerprint,
  status: EnrollmentSessionStatus.QR_GENERATED,
},
```

iOS must still return `QR_NOT_APPLICABLE`. Optional follow-up: iOS “start instructions” endpoint sets `QR_GENERATED` with instruction fingerprint — only if a test exists; otherwise leave iOS on `WAITING_FOR_DEVICE` until Phase 5.

- [x] **Step 5: E2E**

In `backend/test/enrollment.e2e-spec.ts` after POST `.../qr`:

```typescript
expect(qr.body.data.format).toBe('ANDROID_ENTERPRISE_QR');
const afterQr = await request(app.getHttpServer())
  .get(`/api/v1/devices/enrollment-sessions/${sessionId}`)
  .set('Authorization', `Bearer ${tokenA}`)
  .expect(200);
expect(afterQr.body.data.status).toBe('QR_GENERATED');
```

Run: `cd backend && npx jest test/enrollment.e2e-spec.ts --runInBand`

Expected: PASS. Tenant B still 404.

- [x] **Step 6: Merchant Web open statuses**

Add `'QR_GENERATED'` and `'NOT_STARTED'` to `OPEN_STATUSES` in `apps/merchant-web/src/enroll-status.ts`. Add i18n keys `enroll.state.QR_GENERATED`. Extend `enroll-status.spec.ts`.

Run: `cd apps/merchant-web && npm test -- enroll-status.spec.ts`

- [ ] **Step 7: Commit (when the user asks)**

Do not commit unless requested.

---

### Task 2: Device GET fields (dashboard)

**Files:**
- Modify device detail serializer (search `GET /devices/:id` under `backend/src/devices/`)
- Test: existing device e2e if present, else unit on mapper

- [x] **Step 1: Failing test** — detail JSON includes `desiredPresentation`, `platformState`, `enrollmentStatus`, `outstandingBalance` (balance may be `null` until a bind + ledger read exists).

- [x] **Step 2: Minimal mapper** — read `device_policy_states` if the table exists; otherwise return `desiredPresentation: 'NONE'`, `platformState: 'NONE'` without inventing a lock engine.

- [x] **Step 3: Mask IMEI in list endpoints** (already required). Assert list does not include raw national IDs.

- [x] **Step 4: Run tenant isolation** on GET `/devices/:id` with token B → 404.

---

### Task 3: Phase 1 exit (no hardware)

- [x] Backend unit + enrollment e2e green  
- [x] Merchant Web enroll-status tests green  
- [x] Document in CURRENT-PHASE that Phase 1 software is done only after those commands  
- [ ] **Stop.** Phase 2 is a separate plan: replace `ANDROID_CLOUD_DPC_*` in `enrollment-qr.ts` with `com.mip.dpc` component + checksum + HTTPS URL; DPC check-in; **ask before wiping** any phone  

---

## Phase 2 preview (do not execute in the same change)

1. Failing test: QR payload component is **not** `com.google.android.apps.work.clouddpc`.  
2. `buildAndroidEnrollmentQrPayload` uses env `DPC_COMPONENT_NAME`, `DPC_DOWNLOAD_URL`, `DPC_PACKAGE_CHECKSUM`.  
3. Extras bundle: `enrollmentToken`, `enrollmentEndpoint`, `enrollmentSessionId` only.  
4. Kotlin DPC reads extras and POSTs `/api/v1/devices/enroll/check-in`.  
5. Hardware: 6-tap QR on an **authorized** lab device only.
