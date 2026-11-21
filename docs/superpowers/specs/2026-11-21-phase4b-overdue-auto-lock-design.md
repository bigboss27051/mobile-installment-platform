# Phase 4b Overdue Auto-Lock (Lab) Design

**Date:** 2026-11-21  
**Status:** Implemented (lab software)  
**Parent:** R2 Device — Phase 4 Payment Integration  
**Depends on:** Phase 4a `PaymentUnlockOrchestrator`, Phase 3a command loop, ACTIVE Android bind  
**Related:** D-062 (activate after check-in); unlock remains 4a only

## Goal

Staff can run a **tenant-scoped overdue evaluation** that, for each ACTIVE Android device binding whose contract has at least one unpaid schedule item with `dueDate` before today (Asia/Bangkok), sets desired presentation to `LOCK` and enqueues `START_LOCK_TASK` via the existing command path—so the Pad poller can apply Lock Task Mode without inventing lock from a local device clock.

## Non-Goals

- Full ladder `NONE → REMINDER → RESTRICT → LOCK` (Phase 4b+ / product presets later)  
- Cron / Nest interval scheduler (call the same service later)  
- Merchant UI for overdue_days / human-approval gates  
- iOS / MDM  
- Auto-lock from unverified payments or webhooks  
- De-escalation / unlock (stays Phase 4a)  
- Production Device Owner / financing / Play policy claims  
- AMAPI overdue lock (forbidden; D-054)

## Decisions (lab slice)

| Topic | Choice |
|-------|--------|
| Escalation target | Jump to `LOCK` + `START_LOCK_TASK` only |
| Trigger | Staff HTTP endpoint (manual); no cron in this slice |
| Overdue definition | Any schedule item with status ≠ `PAID` and `dueDate < startOfToday(Asia/Bangkok)` |
| Scope | Entire caller tenant’s ACTIVE Android bindings |
| Authz | Same as command: `devices.command` + non-empty `reason` |
| Idempotency | Skip if already desired `LOCK`, or open `START_LOCK_TASK` exists, or audit marker for calendar day already applied |

## Architecture

```text
Staff POST evaluate-overdue (reason + Idempotency-Key)
        │
        ▼
OverdueLockOrchestrator.evaluateTenant(ctx, reason)
        │
        ├─ List ACTIVE device_contract_bindings (Android devices)
        ├─ For each binding: contract schedule overdue?
        ├─ Skip: no overdue | already LOCK | open START_LOCK_TASK | day marker
        └─ DeviceCommandsService.enqueue(START_LOCK_TASK, reason with marker)
                └─ desired → LOCK, platform PENDING, audit COMMAND
```

Symmetric to Phase 4a: **ledger truth → policy → enqueue**; never DPM inside the orchestrator. DPC applies lock only after poll/ack.

## API

### `POST /api/v1/devices/policy/evaluate-overdue`

**Auth:** JWT + tenant + `@RequirePermissions('devices.command')`  
**Headers:** `Idempotency-Key` (required) — replay returns prior summary for same key+tenant without double-enqueue.  
**Body:**

```json
{ "reason": "lab overdue evaluate after due_date backdate" }
```

**Response `200`:**

```json
{
  "data": {
    "evaluatedAt": "2026-11-21T14:00:00.000Z",
    "timezone": "Asia/Bangkok",
    "scannedBindings": 3,
    "locked": [
      { "deviceId": "…", "contractId": "…", "commandId": "…", "reason": "…" }
    ],
    "skipped": [
      { "deviceId": "…", "contractId": "…", "reason": "NOT_OVERDUE" }
    ]
  }
}
```

Skip reasons (non-exhaustive): `NOT_OVERDUE`, `ALREADY_LOCK`, `OPEN_START_LOCK_TASK`, `ALREADY_APPLIED_TODAY`, `NOT_ANDROID`, `NO_BINDING`.

## Overdue rule (exact)

For a binding’s `contractId` + `tenantId`:

1. Load `payment_schedule_items` where `status != PAID`.  
2. Overdue iff ∃ item with `dueDate` date-part **strictly before** calendar date in `Asia/Bangkok` at evaluation time.  
3. Outstanding amount is **not** required beyond unpaid status (unpaid past-due line is enough for lab LOCK).  
4. If all items `PAID` or only future due → not overdue → skip (4a may already have unlocked).

## Lock apply rules

1. Binding `status = ACTIVE`, device `platform = ANDROID`.  
2. Device should be past enrollment bind path (ACTIVE binding implies activate+bind).  
3. If `device_policy_states.desiredPresentation === LOCK` → skip `ALREADY_LOCK`.  
4. If open command (`QUEUED`|`SENT`) of type `START_LOCK_TASK` → skip `OPEN_START_LOCK_TASK`.  
5. Else enqueue with reason:  
   `{staffReason} | overdue-lock:{yyyy-mm-dd}`  
   where date is Bangkok calendar day.  
6. Audit via existing command enqueue path; orchestrator may also write/read audit contains marker for `ALREADY_APPLIED_TODAY` if enqueue succeeded earlier same day.

## Idempotency

- **HTTP Idempotency-Key:** store evaluation run summary keyed by `(tenantId, idempotencyKey)` — prefer a small table or reuse pattern from activations if one exists; if none, document in-plan: either `device_audit_events` with action + key in reason, or a dedicated `device_policy_evaluation_runs` row. **Prefer dedicated run row** for clear replay.  
- **Per-device day marker:** `overdue-lock:{yyyy-mm-dd}` in command reason / audit prevents duplicate LOCK enqueue same day when staff retries with a new key.

## Interaction with Phase 4a

- 4b only escalates to LOCK when overdue.  
- 4a only enqueues STOP when outstanding = 0 after verified payment.  
- Partial pay while still overdue: 4a no-ops (`OUTSTANDING_REMAINS`); 4b may no-op if already LOCK.  
- Paying off after 4b lock: 4a unlocks as today.

## Security / safety

- Tenant isolation mandatory on all queries.  
- Reason required (staff authorization for restrictive action).  
- Never lock from unsigned webhook or device-local clock.  
- Emergency calling remains DPC concern (unchanged).  
- Mask IDs in logs as elsewhere; do not log PAN.

## Tests (mandatory)

- Unit: overdue true/false on dueDate boundaries (Bangkok).  
- Unit: skip NOT_OVERDUE / ALREADY_LOCK / OPEN_START_LOCK_TASK / ALREADY_APPLIED_TODAY.  
- Unit: enqueue START_LOCK_TASK with marker when overdue.  
- Authz: missing permission / missing tenant / missing reason.  
- Tenant isolation: tenant A evaluate does not touch tenant B devices.  
- Idempotency-Key replay returns same summary without second command.  
- Lab (optional): backdate one schedule dueDate on Pad contract → evaluate → poller LOCK.

## Docs / backlog

- `CURRENT-PHASE.md` Phase 4b lab  
- `TASK-BACKLOG.md` `R2-P4-002`  
- `DECISION-LOG.md` short D-063 if needed (lab jump-to-LOCK; ladder later)  
- Lab evidence note when Pad proven

## Out of scope follow-ups

- Cron wrapper calling `evaluateTenant`  
- REMINDER / RESTRICT thresholds from merchant settings  
- Human approval gate before LOCK  
- Welcome QR / LAN HTTPS (orthogonal lab)

## Acceptance

- [ ] Spec reviewed  
- [ ] Implementation plan written  
- [ ] Unit + isolation tests green  
- [ ] Optional Pad E2E: evaluate → START_LOCK_TASK acked → `mLockTaskModeState=LOCKED`  
- [ ] Docs/backlog updated  
