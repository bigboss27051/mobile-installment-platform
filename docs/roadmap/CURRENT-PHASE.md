# Current Phase: R1e — Payment Verify + Allocate

**Previous:** R1d Contract + Schedule — **COMPLETE** on `develop`

## Scope

Backend payment intents, sandbox PromptPay gateway port (HMAC webhooks), FIFO multi-installment allocation, and simple installment ledger postings. Staff-created intents on ACTIVE contracts. Future production target: Omise/Opn (BLOCKED without credentials).

## Spec

`docs/superpowers/specs/2026-11-12-r1e-payment-allocate-design.md`

## Status

Spec approved. Implementation plan next (`docs/superpowers/plans/`).

## Out of Scope

R1f UI apps, live Omise, refunds, customer auth, notifications, device recovery, Stripe-as-PromptPay-primary
