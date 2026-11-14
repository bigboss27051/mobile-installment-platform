# Current Phase: R1 complete — next is **DM0** (R2 Device feasibility)

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is now specified as a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Next gated slice: DM0 — Feasibility & Platform Validation** (~2 weeks). Do not implement enrollment schema/APIs (DM1) or DPC/MDM production paths until DM0 records Android stack and iOS ownership recommendations.

Hardware/Apple/Google proof remains **BLOCKED** for production claims.

## Out of Scope (still)

Live Omise, refunds as a product feature, full MDM/device recovery **production** claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes.
