# Current Phase: R1 complete on `develop` — next is R2 Device

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

## Status

R1 installment core (R1a–R1f) delivered. Next gated slice: **R2 Device** (Android Device Owner / MDM) — blocked on hardware/proof for production claims; brainstorm → spec → plan before implementation.

## Out of Scope (still)

Live Omise, refunds as a product feature, full MDM/device recovery claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change
