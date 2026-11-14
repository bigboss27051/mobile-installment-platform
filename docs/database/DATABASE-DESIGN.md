# Database Design (Phase 0 Draft)

## Platform

- PostgreSQL  
- Prisma ORM  
- UUID primary keys  
- `created_at` / `updated_at` on mutable tables  
- Soft delete only where business requires retain-and-hide  
- Audit tables append-only  

## Financial Types

- Use `DECIMAL(18,2)` (or integer satang — finalize in Phase 1; Phase 0 default `DECIMAL(18,2)` + `currency CHAR(3)`)  
- Never floating point  

## Core Entity Groups

1. **Platform:** Tenant, SubscriptionPlan, TenantSubscription, Entitlement  
2. **Org:** Branch, User, Role, Permission, UserBranch  
3. **Catalog:** Product, ProductVariant, ImeiUnit, StockMovement  
4. **Customer:** Customer, KycCase, KycDocument, Consent  
5. **Origination:** InstallmentPlan, Application, ScorecardResult, ApprovalAction  
6. **Contract:** Contract, ContractVersion, PaymentScheduleItem  
7. **Money:** PaymentIntent, PaymentTransaction, LedgerEntry, Allocation  
8. **Collection:** CollectionCase, CollectionAction  
9. **Device:** Device, DeviceEnrollmentSession, DeviceProvisioningProfile, DeviceActivation, DeviceContractBinding, DevicePolicyState, DeviceCommand, DeviceEvent, DeviceHeartbeat, DeviceRecoveryRequest, DeviceManagementAccount  
10. **Comms:** NotificationTemplate, NotificationDelivery  
11. **Audit:** AuditEvent  

## Critical Uniqueness

- `(tenant_id, imei)` unique for active inventory units (define status-aware unique index)  
- At most one **active** contract binding per IMEI  
- Webhook/`provider_event_id` unique for payment events  
- `Idempotency-Key` unique per tenant + route  

## Indexing Priorities

- All FK `tenant_id` composite indexes with frequent filters  
- Schedule due dates for overdue jobs  
- Device command status + device_id  
- Enrollment session status + expires_at + tenant_id  
- Hardware fingerprint / IMEI hash unique per tenant for devices  
- Customer phone/national-id hash lookups (prefer hashed lookup columns)  

## Enrollment schema (draft — no migrations in this revision)

Consolidation vs the naive 1:1 table list:

| Suggested name | Decision |
|----------------|----------|
| `device_enrollment_tokens` | **Fold into** `device_enrollment_sessions` (`token_hash`, `token_expires_at`, `token_consumed_at`). One live token per session; retries rotate hash. |
| `device_platform_configs` | **Fold into** `device_provisioning_profiles` + `device_management_accounts`. |
| `device_identity_records` | **Fold into** `devices` identifier columns + unique indexes. |
| `device_management_services` | Renamed **`device_management_accounts`**. |
| Policies / commands / events | Keep `enforcement_policies` (merchant config), `device_policy_states`, `device_commands`, `device_events` as already envisioned. |
| Heartbeat | `devices.last_heartbeat_at` **plus** optional `device_heartbeats` only if we need history beyond `device_events`. **Recommendation:** heartbeat snapshots as `device_events` type `HEARTBEAT`; no extra table until volume requires it. |
| Enrollment audit | Reuse `audit_events` with `entity_type=ENROLLMENT_SESSION`; do not duplicate an enrollment_audit table. |

All tenant-owned tables: `tenant_id UUID NOT NULL`, FK to `tenants`, composite indexes `(tenant_id, …)`. Super Admin global MDM account (Model A) uses `tenant_id` **nullable** with `scope = PLATFORM` and elevated access only.

### `device_enrollment_sessions`

**Purpose:** Auditable, expiring enrollment attempt for one contract + platform.  
**PK:** `id` UUID. **FKs:** `tenant_id`, `branch_id`, `contract_id`, `imei_unit_id`, `consent_id`, `created_by_user_id`, `device_id` nullable.  
**Uniques:** at most one `OPEN` session per `(tenant_id, contract_id, platform)` (partial unique index).  
**Status:** `NOT_STARTED` … `RECOVERY_REQUIRED` (see device-management spec).  
**Security:** `token_hash` only; raw token never persisted; TTL required.

Important columns: `platform`, `status`, `shop_code` nullable, `qr_fingerprint` nullable, `expires_at`, `last_error_code`, `provider` (`AMAPI|CUSTOM_DPC|MDM_VENDOR|UNKNOWN`).

### `device_provisioning_profiles`

**Purpose:** Versioned Android extras / iOS instruction templates **without secrets**.  
**PK:** `id`. **FKs:** `tenant_id` nullable for platform defaults.  
**Uniques:** `(tenant_id, platform, name, version)`.  
**Security:** no private keys; DPC download URL must be HTTPS Play/AMAPI — not an unsigned APK with embedded admin password.

### `devices`

**Purpose:** Registry.  
**PK:** `id`. **FKs:** `tenant_id`, `branch_id`, `management_account_id` nullable.  
**Uniques:** `(tenant_id, hardware_fingerprint)`; `(tenant_id, imei)` where imei present (align with inventory).  
**Status:** `PENDING_ENROLL|ENROLLED|ACTIVE|LOCKED_LEVEL|UNENROLLED|LOST|REPLACED` — lock *level* still lives in `device_policy_states`.  
**Identifiers:** `platform`, `os_version`, `serial_hash`, `imei`, `imei_hash`, `android_enterprise_id`, `ios_udid_hash`, `vendor_device_id`.  
**Security:** mask IMEI in lists; hashes for lookup.

### `device_activations`

**Purpose:** First successful registration tying device to merchant + customer.  
**PK:** `id`. **FKs:** `tenant_id`, `device_id`, `enrollment_session_id`, `customer_id`, `actor_user_id`.  
**Uniques:** one activation row per `device_id` (re-activation = recovery request + new session).  
**Status:** `COMPLETED`.

### `device_contract_bindings`

**Purpose:** History of binds; at most one `ACTIVE` per device and per IMEI.  
**PK:** `id`. **FKs:** `tenant_id`, `device_id`, `contract_id`, `imei_unit_id`.  
**Uniques:** partial unique `(device_id) WHERE status=ACTIVE`; `(imei_unit_id) WHERE status=ACTIVE`.  
**Status:** `ACTIVE|UNBOUND|REPLACED`.  
**Security:** bind only from authorized staff after session verify.

### `device_management_accounts`

**Purpose:** Per-tenant or platform AMAPI/MDM configuration **references**.  
**PK:** `id`. **FKs:** `tenant_id` nullable (platform Model A).  
**Uniques:** `(tenant_id, provider, environment)`.  
**Columns:** `provider`, `scope` (`PLATFORM|TENANT`), `status` (`PENDING|CONNECTED|ERROR|REVOKED`), `secret_ref` (KMS/secret manager id — **not** the secret), `external_org_name`, `display_name`.  
**Security:** never store raw Apple/Google JSON in Postgres if avoidable; if required, envelope-encrypt.

### Existing / remaining device tables

- `enforcement_policies` — merchant level thresholds (already in dictionary).  
- `device_policy_states` — current level + policy version on a device.  
- `device_policy_assignments` — **optional**; skip until a device can have multiple profiles. Use `device_policy_states.policy_version` + `enforcement_policies`.  
- `device_commands`, `device_events` — as Phase 0.  
- `device_recovery_requests` — `type`, `status`, `reason`, `from_device_id`, `to_device_id` nullable, `contract_id`.

### `device_enrollment_sessions` indexes

`(tenant_id, status, expires_at)`, `(tenant_id, contract_id)`, `(token_hash)` unique.

Webhook/event uniqueness remains `(provider, provider_event_id)` global or per tenant.

---

## Migration Strategy

- Prisma migrate in environments: local → dev → staging → prod  
- Expand/contract for breaking changes  
- Backup before prod migrate  
