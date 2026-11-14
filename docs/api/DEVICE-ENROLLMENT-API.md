# Device Enrollment API (draft)

**Base:** `/api/v1`  
**Conventions:** [API-STANDARDS.md](./API-STANDARDS.md)  
**Auth:** `Authorization: Bearer` with audience `merchant-web` | `merchant-mobile` | `device-agent` | `super-admin` as noted.  
**Tenant:** from token only.  
**DM1 stub (2026-11-14):** session create/get/cancel + Android QR JSON **without Google HTTP and without Wi-Fi secrets**.  
**DM2 stub (2026-11-14):** staff `activate` / `bind-contract` / `unbind-contract` persist local device + audit rows only. Production AMAPI enroll/lock remains BLOCKED (D-054).

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
`payloadFingerprint` is a hash for audit; **payload JSON is returned only to authorized staff** and must exclude Wi-Fi passwords and secrets (token is an opaque enrollment credential only).

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

**Auth:** enrollment token (`Authorization: Bearer enc_<token>` or header `X-Enrollment-Token`) **or** MDM adapter service credential.  
**Purpose:** First contact from DPC/AMAPI/MDM that the device exists.

Request: platform identifiers (Android: IMEI hashed/plain per PDPA rules, serial, `enterpriseSpecificId`; iOS: UDID/serial via MDM — store hashed if required), `sessionId` if known.

Tenant derived from token. Creates/updates `devices` row; session → `ENROLLING`.

Idempotent on `(tenant_id, platform, hardware_fingerprint)`.

### POST `/webhooks/device-management/:provider`

Signed vendor webhooks (AMAPI Pub/Sub proxy, MDM). Verify signature; idempotent `provider_event_id`. Never trust unsigned body for commands.

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

Staff. Detail including policy level, last heartbeat, enrollment.

### GET `/devices/:id/events`

Staff. Paginated `device_events`.

### GET `/devices/:id/heartbeat`

Staff. Last heartbeat + freshness. `410` if never seen.

### POST `/devices/:id/commands`

Staff with **device restrict** permission for levels ≥4.  
Body: `{ "type", "level?", "reason", "expiresAt" }`  
`Idempotency-Key` required.  
Creates `QUEUED` command; HTTP 201 ≠ executed.  
iOS unsupported type → `422 UNSUPPORTED_CAPABILITY` (no silent no-op success).

### POST `/devices/:id/heartbeat` (device-agent)

Device JWT. Body: connectivity, policy version, battery optional — **no** location tracking unless separately consented and specified (currently **not in scope**).

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

Customer APIs remain read-only device status under `/api/v1/me/...` in a later slice — not enrollment.
