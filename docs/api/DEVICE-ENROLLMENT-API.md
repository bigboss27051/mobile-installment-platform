# Device Enrollment API (draft)

**Base:** `/api/v1`  
**Conventions:** [API-STANDARDS.md](./API-STANDARDS.md)  
**Auth:** `Authorization: Bearer` with audience `merchant-web` | `merchant-mobile` | `device-agent` | `super-admin` as noted.  
**Tenant:** from token only.  
**DM1 stub (2026-11-14):** session create/get/cancel + Android QR JSON **without Google HTTP and without Wi-Fi secrets**.  
**DM2 stub (2026-11-14):** staff `activate` / `bind-contract` / `unbind-contract` persist local device + audit rows only. Production DPC QR / Device Owner / AMAPI lock remain BLOCKED until Phase 2+ evidence (D-054, D-057).

Idempotency: `Idempotency-Key` required on session create, activate, bind, unbind, command create.

---

## Enrollment

### POST `/devices/enrollment-sessions`

**Purpose:** Start a short-lived enrollment session for a contract + platform.  
**Auth:** Staff JWT.  
**Authz:** Enroll permission; branch must own the contract.  
**Tenant:** Contract `tenant_id` must match token.

Request:

```json
{
  "contractId": "uuid",
  "platform": "ANDROID | IOS",
  "imeiUnitId": "uuid",
  "consentId": "uuid",
  "ttlSeconds": 3600
}
```

Validation: contract `ACTIVE`; IMEI available or already reserved to this contract; consent current; `ttlSeconds` ≤ 86400; platform enabled for tenant.

Response `201`: `{ "data": { "id", "status": "WAITING_FOR_DEVICE", "platform", "expiresAt", "shopCode": "optional" } }`  
Statuses: `NOT_STARTED` \| `WAITING_FOR_DEVICE` \| `QR_GENERATED` \| `PROVISIONING` \| `ENROLLING` \| `VERIFYING` \| `ACTIVATING` \| `COMPLETED` \| `FAILED` \| `EXPIRED` \| `CANCELLED` \| `RECOVERY_REQUIRED`.  
Do **not** return raw token in list views; return `enrollmentToken` **once** on create (or via QR endpoint).

Errors: `422 CONTRACT_NOT_ACTIVE`, `409 IMEI_BOUND`, `403 BRANCH_DENIED`, `409 SESSION_OPEN` (optional: one open session per contract), `422 IOS_PREREQ_UNMET`.

Idempotency: same key + body → same session.

### GET `/devices/enrollment-sessions/:id`

Staff. Same tenant. Returns status, timestamps, deviceId if any, lastError. Never returns raw token after create.

### POST `/devices/enrollment-sessions/:id/qr`

**Purpose:** Materialize Android (or future) QR payload + image metadata.  
**Authz:** same as get.  
**iOS:** returns `400 QR_NOT_APPLICABLE` with `instructions` document id instead.

Response: `{ "data": { "format": "ANDROID_ENTERPRISE_QR", "payloadFingerprint", "svgOrPngRef", "expiresAt" } }`  
Successful QR issue moves the session to `QR_GENERATED`.  
`payloadFingerprint` is a hash for audit; **payload JSON is returned only to authorized staff** and must exclude Wi-Fi passwords and secrets (token is an opaque enrollment credential only).  
QR JSON names the **custom DPC** component, HTTPS download URL, package checksum, and `PROVISIONING_ADMIN_EXTRAS_BUNDLE` (session id, token, check-in URL). Not an AMAPI Google DPC token.

### POST `/devices/enrollment-sessions/:id/verify`

Staff confirms identity after OS enroll (IMEI/serial vs inventory).  
`409 IDENTITY_MISMATCH`, `422 NOT_ENROLLED`.

### POST `/devices/enrollment-sessions/:id/cancel`

Staff. Open sessions only. Tokens revoked.

### POST `/devices/enrollment-sessions/:id/retry`

Invalidates old token, issues new, resets to `WAITING_FOR_DEVICE` if recovery allows. Audited.

---

## Device agent / MDM callbacks

### POST `/devices/enroll/check-in`

**Auth:** enrollment token (`Authorization: Bearer enc_<token>` or header `X-Enrollment-Token`).  
**Purpose:** First contact from the custom DPC that the device exists.

Request body: `deviceOwner` (boolean), optional `sessionId`, optional `errorCode`, optional `serial`. The token stays in the header. Tenant comes from the token hash. A `QR_GENERATED` session with `deviceOwner: true` creates or reuses the device row and moves the session to `ENROLLING`. `deviceOwner: false` sets `FAILED` and does not create a device.

Idempotent on `(tenant_id, platform, hardware_fingerprint)`.

### POST `/webhooks/device-management/:provider`

Signed vendor webhooks (MDM; AMAPI only if that adapter is enabled). Verify signature; idempotent `provider_event_id`. Never trust unsigned body for commands.

---

## Activation and binding

### POST `/devices/activate`

**Auth:** staff **or** device-agent after enroll (product choice: default **staff-confirmed** for bind; device may send shop code + customer fields as *hints* only).

Request:

```json
{
  "enrollmentSessionId": "uuid",
  "shopCode": "optional",
  "customerId": "uuid",
  "contractId": "uuid"
}
```

Shop code maps to tenant/session; **insufficient alone** to bind. Must match session tenant and contract.

`409 ALREADY_ACTIVATED` returns existing device (idempotent).

### GET `/devices/:id/activation`

Staff. Activation record + actor + timestamps.

### POST `/devices/:id/bind-contract`

Staff. Body `{ "contractId", "reason" }`. One ACTIVE bind. Aligns IMEI with contract’s `ImeiUnit`.

### POST `/devices/:id/unbind-contract`

Staff elevated. Body `{ "reason", "recoveryRequestId?" }`. History retained.

---

## Device management

### GET `/devices`

Staff. Filters: `platform`, `status`, `contractId`, `branchId`. Masked identifiers in lists.

### GET `/devices/:id`

Staff. Detail including merchant/customer/contract, brand/model, platform, identifiers (masked), enrollment status, activation, **desiredPresentation**, **platformState**, last heartbeat, last command result, outstanding balance.

### GET `/devices/:id/events`

Staff. Paginated `device_events`.

### GET `/devices/:id/heartbeat`

Staff. Last heartbeat + freshness. `410` if never seen.

### POST `/devices/:id/commands`

Staff with **device restrict** permission for RESTRICT/LOCK (levels ≥3).  
Body: `{ "type", "presentation?": "REMINDER|RESTRICT|LOCK|UNLOCK", "level?", "reason", "expiresAt" }`  
`Idempotency-Key` required.  
Creates `QUEUED` command; HTTP 201 ≠ executed.
iOS unsupported type → `422 UNSUPPORTED_CAPABILITY` (no silent no-op success).

### POST `/devices/policy/evaluate-overdue`

**Auth:** Staff JWT + tenant.
**Authz:** `devices.command` (same as device commands).
**Headers:** `Idempotency-Key` required — replay with the same key returns the stored summary without re-enqueueing.
**Body:** `{ "reason": "non-empty staff reason" }`

**Purpose:** Tenant batch overdue evaluation (Phase 4d ladder, D-065). Scans ACTIVE Android bindings; computes overdue days from the oldest unpaid past-due installment (Asia/Bangkok): ≥1 → `REMINDER` (desired+audit only, `commandId` null), ≥3 → `RESTRICT` + `START_PACKAGE_SUSPEND`, ≥7 → `LOCK` + `START_LOCK_TASK`. Escalate-only (skips if already at/above target). Day marker `overdue-ladder:{ymd}:{target}`.

**Response `200`:** `{ "data": { "evaluatedAt", "timezone": "Asia/Bangkok", "scannedBindings", "locked": [{ "deviceId", "contractId", "commandId", "target", "reason" }], "skipped": [{ "deviceId", "contractId", "reason" }], "replay"?: true } }`

Does not unlock (Phase 4a / staff STOP). Optional cron: `OVERDUE_EVALUATE_CRON` (D-064) uses the same `evaluateTenant` path.

### POST `/devices/agent/heartbeat` (device-agent)

Header `X-Device-Agent-Token` (`dat_…` from check-in). Body: `{ connectivity?, policyVersion?, batteryPercent?, location? }`. Updates `devices.last_heartbeat_at`. Optional `location` (`lat`, `lng`, `accuracyMeters?`, `source`, `capturedAt`) only when desired policy is `RESTRICT` or `LOCK` (D-061); otherwise `400 LOCATION_NOT_ALLOWED`. Staff see heartbeat on `GET /devices/:id` / `GET /devices/:id/heartbeat` (`410 HEARTBEAT_NEVER_SEEN` if never), and last-known on device detail.

### GET `/devices/:id/location-history`

Staff. Requires `devices.location.read`. Tenant-scoped samples (newest first). Audited as `LOCATION_READ`.

### POST `/devices/:id/command-acks` (device-agent)

Ack/result. Replay-safe.

---

## Recovery

### POST `/devices/:id/recovery-requests`

Types: `REENROLL`, `REPLACE`, `UNENROLL`, `RELEASE`, `CONTRACT_CLOSE`. Reason required. Approval if tenant policy requires.

---

## Error codes (device)

| Code | HTTP |
|------|------|
| `ENROLLMENT_EXPIRED` | 410 |
| `ENROLLMENT_CANCELLED` | 409 |
| `QR_NOT_APPLICABLE` | 400 |
| `IOS_PREREQ_UNMET` | 422 |
| `IDENTITY_MISMATCH` | 409 |
| `IMEI_BOUND` | 409 |
| `UNSUPPORTED_CAPABILITY` | 422 |
| `DEVICE_COMMAND_DENIED` | 403 |
| `PLAYLOAD_SECRET_FORBIDDEN` | 400 (server-side generation guard) |

### GET `/me/lock-status`

**Auth:** Customer JWT. Tenant + customer from token.  
**Purpose:** Read-only lock **presentation** for the customer app (IOS-B). Does not enroll, bind, or send MDM commands.

Response `data`:

- `contractId` (nullable if none)
- `deviceId` (nullable)
- `platform` (`IOS` \| `ANDROID` \| null)
- `enrollmentStatus` (session status or `NOT_ENROLLED`)
- `desiredPresentation`: `NONE` \| `REMINDER` \| `RESTRICT` \| `LOCK` (from overdue schedule; **not** OS lock)
- `osEnforcement`: `NONE` \| `PENDING` \| `PACKAGES_SUSPENDED` \| `LOCK_TASK` \| `SINGLE_APP_MODE` \| `DEVICE_LOCK` — **`NONE` until DPC/MDM ack exists**
- `phoneLockedByMdm`: boolean (must be false unless `osEnforcement` is confirmed)
- `outstandingBalance`, `currency`
- `merchantName`
- `latestIntent` optional (`id`, `status`, `qrPayload`)
- `disclaimer`: string the app must show when desired is LOCK but OS is not

Cross-tenant/customer: 404/empty, never another tenant’s device.
