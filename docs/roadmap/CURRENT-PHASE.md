# Current Phase: R1 complete — next is **DM0** (R2 Device feasibility)

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is now specified as a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (stakeholder):** AMAPI; iOS Model B + vendor MDM + Configurator iPhone; QR + reseller Zero-touch; device management **mandatory**. See D-042–D-053.

**DM0 desk lab (2026-11-14):** API/ToS research in [../device-management/DM0-FEASIBILITY-REPORT.md](../device-management/DM0-FEASIBILITY-REPORT.md). **CRITICAL:** AMAPI Permissible Usage forbids EMI/payment-based device restriction (**D-054**). Hardware enroll **not run**.

**DM1 stub:** enrollment sessions API is on `develop` (no AMAPI). Still submit Google inquiry and physical lab. Do **not** implement AMAPI lock-on-overdue. Do **not** claim Device Owner production.

Hardware/Apple/Google **production** proof remains BLOCKED.

## Out of Scope (still)

Live Omise, refunds as a product feature, full MDM/device recovery **production** claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes.
