# Merchant Policy Settings Design

**Date:** 2026-11-22  
**Status:** Implemented (lab software)  
**Parent:** Phase 4d deferred “merchant thresholds / human approval” (D-065)  
**Decision:** D-067 (proposed)  
**Depends on:** Overdue ladder evaluate/cron (`OverdueLockOrchestrator`), Merchant Web, RBAC Phase 3a

## Goal

Per-tenant overdue ladder thresholds and controls: REMINDER / RESTRICT / LOCK day cutoffs, cron auto-evaluate on/off, and optional human approval before LOCK — with a Merchant Web **นโยบาย** page for OWNER settings and staff lock-approval queue.

## Non-goals

- Human approval before RESTRICT or REMINDER  
- Maker/checker dual control  
- Wiring overdue ladder → LINE / external alerting  
- Merchant-custom ladder shapes beyond three day integers  
- iOS / production Device Owner claims  
- Changing payment-to-unlock (4a) or staff STOP commands  

## Decisions (brainstorm)

| ID | Decision |
|----|----------|
| MPS-001 | Scope = thresholds + cron toggle + lock-approval gate |
| MPS-002 | Lock approval = pending queue; staff approve → enqueue `START_LOCK_TASK` (desired LOCK only after approve path) |
| MPS-003 | OWNER (`devices.policy.config`) edits settings; `devices.command` lists/approves/rejects lock queue |
| MPS-004 | `autoEvaluateCronEnabled=false` skips **cron** for that tenant only; staff `evaluate-overdue` still runs |
| MPS-005 | `requireLockApproval` is a tenant toggle; **default true** |
| MPS-006 | UI = dedicated nav page **นโยบาย** (settings form + pending LOCK queue) |
| MPS-007 | Persistence = `TenantDevicePolicySettings` + `DeviceLockApproval` (not JSON-on-Tenant; not hijacking command status) |

## Defaults (D-065 compatible)

| Field | Default |
|-------|---------|
| `reminderAfterDays` | 1 |
| `restrictAfterDays` | 3 |
| `lockAfterDays` | 7 |
| `autoEvaluateCronEnabled` | true |
| `requireLockApproval` | true |

Validation: integers; `1 ≤ reminderAfterDays < restrictAfterDays < lockAfterDays ≤ 365`.

## Data model

### `TenantDevicePolicySettings`

- `tenantId` PK/unique FK → `Tenant`  
- Day fields + two booleans above  
- `createdAt` / `updatedAt`  
- Lazy-create with defaults on first `GET` (or first evaluate if missing)

### `DeviceLockApproval`

- `id` UUID PK  
- `tenantId`, `deviceId`, `contractId`  
- `status`: `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`  
- `overdueDays` Int  
- `reason` (evaluate reason / staff reject-approve note)  
- `requestedAt`, `resolvedAt`, `resolvedByUserId` (nullable until resolved)  
- At most one `PENDING` per `deviceId` (partial unique or app-enforced + unique index on `(deviceId)` where `status = PENDING`)  
- Tenant isolation on every query  

### Lifecycle cancels

Cancel open `PENDING` when: binding unbound / inactive; payment unlock clears restriction path; staff STOP to `NONE` while still pending; device recovery/REENROLL as needed — so stale queues do not lock after cure.

## Authz

| Permission | Who | Use |
|------------|-----|-----|
| `devices.policy.config` | OWNER, SUPER_ADMIN only (not STAFF) | GET/PUT settings |
| `devices.command` | OWNER + STAFF (existing) | List / approve / reject lock approvals; existing evaluate-overdue |

## API (`/api/v1`)

| Method | Path | Perm |
|--------|------|------|
| `GET` | `/devices/policy/settings` | `devices.policy.config` |
| `PUT` | `/devices/policy/settings` | `devices.policy.config` |
| `GET` | `/devices/policy/lock-approvals?status=PENDING` | `devices.command` |
| `POST` | `/devices/policy/lock-approvals/:id/approve` | `devices.command` |
| `POST` | `/devices/policy/lock-approvals/:id/reject` | `devices.command` |

Approve/reject: non-empty `reason` body + `Idempotency-Key` header (same pattern as evaluate-overdue). Approve enqueues `START_LOCK_TASK` with reason including approval id; sets desired LOCK via existing command path. List responses mask IMEI like device list.

Audit: settings change + approval resolve (approve/reject/cancel).

## Orchestrator / cron changes

1. Load tenant settings (defaults if missing).  
2. `targetFromOverdueDays(days, settings)` uses tenant cutoffs.  
3. If target is LOCK and `requireLockApproval`:  
   - Ensure one `PENDING` `DeviceLockApproval` (idempotent for same evaluate day/device).  
   - **Do not** set desired LOCK or enqueue lock command.  
   - Skip reason e.g. `LOCK_PENDING_APPROVAL` (or count under locked/skipped summary field — prefer explicit skipped reason).  
4. If target is LOCK and approval disabled: existing escalate-only LOCK path.  
5. REMINDER / RESTRICT unchanged aside from day cutoffs.  
6. Cron: skip tenant when `autoEvaluateCronEnabled === false`.  

Escalate-only vs current desired rank remains. Idempotency markers for REMINDER/RESTRICT/LOCK auto path keep `overdue-ladder:{ymd}:{target}` where auto LOCK still applies.

## Merchant Web

- Nav item **นโยบาย** / **Policy** (TH+EN i18n).  
- Page sections:  
  1. Settings form (days + toggles + save) — only if caller can config (hide/disable for STAFF).  
  2. Pending LOCK table — approve / reject with reason; refresh list.  
- Reuse existing `./ui` kit (no MUI rewrite in this slice).  
- STAFF: queue only; OWNER: form + queue.

## Error handling

| Case | Behavior |
|------|----------|
| Invalid day order / bounds | `400` validation |
| STAFF PUT settings | `403` |
| Approve non-PENDING / wrong tenant | `404` or `409` |
| Duplicate approve (idempotency) | Replay same success summary |
| Device already LOCK / above | Approve no-ops or skips enqueue with clear skip reason |

## Testing (mandatory)

- Unit: `targetFromOverdueDays` with custom thresholds; approval gate creates PENDING without command; approval off still enqueues LOCK; cron skip when disabled; settings validation.  
- Authz: STAFF cannot PUT settings; STAFF can approve with `devices.command`.  
- Tenant isolation: cannot read/approve other tenant’s approvals.  
- Merchant Web: OWNER save form; STAFF sees queue not form (or disabled); approve calls API.  

## Acceptance

1. OWNER can change 1/3/7-style days and toggles; evaluate/cron honor them.  
2. With approval on, overdue LOCK creates PENDING only; device stays below LOCK until approve.  
3. Approve → `START_LOCK_TASK` + desired LOCK; reject → no lock command.  
4. Cron respects `autoEvaluateCronEnabled`.  
5. Docs: CURRENT-PHASE, TASK-BACKLOG `R2-P4-009`, DECISION-LOG D-067.  
6. Lab only — no production DO claim.

## Out of scope follow-ups

Merchant approval before RESTRICT; LINE on ladder step; per-branch thresholds; REMINDER push command type.
