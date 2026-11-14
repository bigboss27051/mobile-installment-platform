# Current Phase: R1 complete — **Phase 1 Shared Enrollment Foundation** next

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

DM1 session stub + DM2 activate/bind/unbind (database only, no Google/Apple HTTP). Merchant Web **enroll** page creates a session and shows stub QR.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (D-057):** Android **custom DPC + Device Owner + QR** (no PC for normal customer enroll). iOS **Model B + vendor MDM + Configurator iPhone**. Device management **mandatory**. AMAPI is not the lock engine (D-054). Prototype ≠ commercial approval.

**Next software:** Phase 1 — expand enrollment foundation (`QR_GENERATED`, identity, wizard/dashboard). Then Phase 2 — Android QR DPC on **authorized** lab devices. **Ask before factory-resetting any phone.**

**Do not** implement Phases 3–7 in the same change. **Do not** claim production Device Owner.

**IOS-A (docs):** vendor MDM + Model B + Single App Mode (D-056). **IOS-B:** customer Flutter lock UI + `GET /me/lock-status`. Full MDM / SAM lab is Phase 5–6 and remains BLOCKED on Apple.

Hardware/Apple **production** proof remains BLOCKED. Google AMAPI inquiry is optional/historical, not the implementation path.

## Out of Scope (still)

Live Omise, refunds as a product feature, production MDM/DPC claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes, AMAPI overdue lock.
