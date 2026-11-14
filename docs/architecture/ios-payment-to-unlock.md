# iOS payment-to-unlock

**Status:** Target design for Phase 6. IOS-B displays payment UI only; it does **not** unlock the OS.  
Shared orchestrator: [payment-to-unlock.md](./payment-to-unlock.md).  
**Money movement** remains the source of payment truth. Device Control must not mark intents paid.

## Flow

1. Licensed gateway webhook, **signature verified**, idempotent `provider_event_id`.  
2. Allocate against schedule (existing FIFO payments module).  
3. Shared policy evaluation (engine **not built yet** — do not duplicate a second engine in the iOS adapter).  
4. If outstanding is cleared (or policy says unlock): enqueue `DISABLE_SINGLE_APP_MODE`.  
5. MDM vendor executes; wait for ack.  
6. Update `osEnforcement` then business presentation.  
7. Notify merchant and customer.

Partial payment: outstanding may remain; policy may stay REMINDER/RESTRICT/LOCK. Reversals re-evaluate; they must not apply a *new* restrictive command from an unverified event.

Customer-uploaded screenshots are **not** payment proof.

## App behavior (IOS-B)

- PromptPay QR from `POST /api/v1/me/contracts/:id/payment-intents` (existing).  
- Paid only when intent `SUCCEEDED` (`isServerConfirmedPaid`).  
- Poll `GET /api/v1/me/payment-intents/:id` and `GET /api/v1/me/lock-status`.  
- Copy: if payment succeeded but `osEnforcement` is still `SINGLE_APP_MODE` / `PENDING`, show **unlock pending** (device offline or MDM delay) — not “phone unlocked.”

## Idempotency

Same webhook, same intent, same command idempotency key → one unlock command. Duplicate MDM acks are no-ops.
