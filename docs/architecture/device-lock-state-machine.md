# Device lock state machine (shared)

Platform-agnostic **business** policy. Android and iOS adapters execute different OS commands. Do not store “the phone is locked” as a single boolean.

## Three layers (mandatory)

| Layer | Who owns it | Examples |
|-------|-------------|----------|
| **Installment / ledger** | Payments module | Overdue items, outstanding `DECIMAL` balance, last verified payment |
| **Desired presentation** | Device Lock Policy Engine | `NONE` \| `REMINDER` \| `RESTRICT` \| `LOCK` |
| **Platform enforcement** | Android DPC or Apple MDM adapter | `NONE`, `PACKAGES_SUSPENDED`, `LOCK_TASK`, `SINGLE_APP_MODE`, `UNSUPPORTED` |

UI and APIs must show **desired** and **platform** separately (`GET /me/lock-status` already does this for iOS). HTTP command create ≠ device executed.

## Desired presentation

```text
NONE → REMINDER → RESTRICT → LOCK
         ↑            ↑         ↑
         └──────── UNLOCK (authorized) ────┘
```

- Transitions to RESTRICT/LOCK require authz + reason (staff or policy job after **verified** ledger state).  
- UNLOCK is not a stored presentation; it is a command that drives desired → `NONE` or `REMINDER` per remaining arrears.  
- Partial payment may leave REMINDER.  
- Reversals re-evaluate; they must not apply a *new* restriction from an unverified event.

## Mapping to Android 1–5 (D-003)

| Desired | Android level | Typical platform |
|---------|---------------|------------------|
| NONE | 1 | Baseline DO |
| REMINDER | 2 | Notifications only |
| RESTRICT | 3 | Package suspend / allowlist |
| LOCK | 4 (5 only if policy requires extra restrict **with** emergency dial) | Lock Task Mode |

iOS has **no** equivalent of Android 5 suspend. See [../device-management/CAPABILITY-MATRIX.md](../device-management/CAPABILITY-MATRIX.md).

## Command lifecycle

```text
QUEUED → SENT → ACKED_SUCCESS | ACKED_FAILED | EXPIRED | UNSUPPORTED
```

Idempotency key per device + type + policy version. Duplicate acks are no-ops.

## Enrollment vs lock

A device with session ≠ `COMPLETED` must not receive RESTRICT/LOCK. Recovery/unenroll is a different workflow from lock.
