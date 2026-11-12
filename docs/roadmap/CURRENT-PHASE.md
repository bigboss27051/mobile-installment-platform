# Current Phase: R1f — Merchant Web + Customer Android Critical Paths

**Previous:** R1e Payment Verify + Allocate — **COMPLETE** on `develop`

## Scope

Merchant Web and Customer Android critical paths for the Thailand pilot: staff/customer payment UX on top of R1e sandbox intents/webhooks, contract/payment visibility, and the minimum journeys needed to exercise apply → approve → contract → pay end-to-end from clients. Live Omise/Opn remains BLOCKED without credentials.

## Status

R1e backend payments slice complete (schema, FIFO allocate, sandbox HMAC gateway, staff idempotent intents, webhook allocate + ledger, e2e isolation). Next: R1f client critical paths — brainstorm → design spec → plan before implementation.

## Out of Scope (still)

Live Omise, refunds as a product feature, full MDM/device recovery claims, Stripe-as-PromptPay-primary, scaffolding all remaining apps in one change
