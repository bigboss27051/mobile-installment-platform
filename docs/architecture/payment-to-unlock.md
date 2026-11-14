# Payment-to-unlock (shared)

**Status:** Target for Phase 4. iOS-specific SAM disable remains [ios-payment-to-unlock.md](./ios-payment-to-unlock.md).  
**Policy:** [device-lock-state-machine.md](./device-lock-state-machine.md)

Money movement remains the source of payment truth. Device Control **must not** mark intents paid.

## Orchestrator (Device context)

A single **Payment-to-Unlock Orchestrator** consumes **verified** payment domain events (signature checked, idempotent `provider_event_id`, allocated). It:

1. Loads contract + device binding + outstanding balance.  
2. Asks the **Device Lock Policy Engine** for the new desired presentation.  
3. If unlock (or step-down) is required, enqueues a platform command via **only** the matching adapter:  
   - Android → DPC `STOP_LOCK_TASK` / unsuspend envelope  
   - iOS → MDM disable Single App Mode  
4. Waits for ack; updates `osEnforcement` / platform state.  
5. Notifies merchant and customer.

Do not put Android `DevicePolicyManager` or Apple plist commands in this orchestrator.

## Rules

- Customer screenshots are **not** proof.  
- Duplicate webhooks → one unlock command.  
- Device offline → desired may be `NONE` while platform is still `LOCK_TASK` / `SINGLE_APP_MODE`; UI says **unlock pending**.  
- Offline recovery: DPC/MDM retries last authorized command; staff recovery is audited.  
- Command retries with backoff; poison → `FAILED` + alert, not silent success.

## Phase boundary

Phase 3 may lock/unlock from **authorized staff commands** on lab devices. Phase 4 wires verified payment events. Do not auto-lock from overdue jobs until Phase 4 policy automation and production gates allow it.
