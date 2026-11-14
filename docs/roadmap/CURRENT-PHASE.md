# Current Phase: R1 complete — **DM0 human gates** + **DM2 software stub**

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

DM1 session stub + DM2 activate/bind/unbind (database only, no AMAPI/Apple HTTP). Merchant Web **enroll** page creates a session and shows stub QR.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (stakeholder):** AMAPI; iOS Model B + vendor MDM + Configurator iPhone; QR + reseller Zero-touch; device management **mandatory**. See D-042–D-053.

**Next (people, not lock code):** submit Google AMAPI inquiry — packet [OPERATOR-PACKET.md](../device-management/OPERATOR-PACKET.md), form https://services.google.com/fb/forms/AMAPIUsageInquiry/ (DM0-006). Checklist: [HUMAN-OPS-NOW.md](../device-management/HUMAN-OPS-NOW.md). **CRITICAL:** AMAPI Permissible Usage forbids EMI/payment-based device restriction (**D-054**). Hardware enroll **not run**.

**DM1/DM2 stubs:** sessions + activate/bind on API. Still submit Google inquiry and physical lab. Do **not** implement AMAPI lock-on-overdue. Do **not** claim Device Owner production.

Hardware/Apple/Google **production** proof remains BLOCKED.

## Out of Scope (still)

Live Omise, refunds as a product feature, full MDM/device recovery **production** claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes.
