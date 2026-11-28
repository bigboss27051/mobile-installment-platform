# Android kiosk locking

**Status:** Prototype design for Phase 3 (D-057). Not implemented as production financing lock.  
**State machine:** [device-lock-state-machine.md](./device-lock-state-machine.md)  
**Unlock:** [payment-to-unlock.md](./payment-to-unlock.md)

## Approach

Prototype: **custom DPC + Device Owner + Lock Task Mode (kiosk)** plus `setPackagesSuspended` where the API exists.

Do **not** confuse:

| Mechanism | Meaning | Use for financing UX? |
|-----------|---------|------------------------|
| **Lock Task Mode** | Device stays in an allowlisted app (mp_pay lock UI) | **Yes** — LOCK presentation |
| `DevicePolicyManager.lockNow()` | Immediate keyguard lock | **No** as the installment “mp_pay lock” screen |
| App-level full-screen overlay without DO | Easy to dismiss / uninstall | **No** as OS lock |

## Business presentations (Android)

| Presentation | Device behavior | 5-level map (D-003) |
|--------------|-----------------|---------------------|
| **NONE** (current) | Usable; baseline DO policies only | Level 1 |
| **REMINDER** | Fully usable; overdue notifications; record reminder | Level 2 |
| **RESTRICT** | Suspend non-essential packages where supported; keep phone, messages, emergency, payment app | Level 3 |
| **LOCK** | Start Lock Task Mode on mp_pay lock; show outstanding balance, PromptPay QR, merchant contact | Level 4 (+ Level 5 still must not block emergency) |
| **UNLOCK** | Authorized command; stop lock-task; unsuspend per policy; report actual result | Return toward Level 1 |

Level 5 “maximum restrict” remains Android-only in the capability matrix. It must still allow emergency calling. It is **not** a second undocumented lock API.

## mp_pay lock UI (LOCK)

Shown only when Lock Task Mode is **actually** active (or DPC reports it so). Content:

- Outstanding installment balance (from last authorized policy payload / customer APIs)  
- PromptPay QR for the current verified-intent flow  
- Merchant contact  
- Unlock pending copy if payment succeeded but command not acked  

The Flutter customer app may render the same **presentation**, but OS kiosk is the DPC’s job.

## Command rules

- Staff or Payment-to-Unlock Orchestrator enqueues `device_commands` with reason + authz + expiry.  
- DPC executes and acks **platform** result (`LOCK_TASK_ACTIVE`, `PACKAGES_SUSPENDED`, `UNSUPPORTED`).  
- Backend never assumes success from HTTP 201.  
- Unverified payment webhooks never raise restriction.  
- Reboot: Recovery Handler re-applies last **authorized** policy; it does not escalate.

## OEM gaps

If `setPackagesSuspended` or lock-task is missing/broken, ack `UNSUPPORTED_CAPABILITY`. Do not fake suspend by killing processes. Record the SKU as matrix fail or limited.
