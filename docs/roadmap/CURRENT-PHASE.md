# Current Phase: **Phase 2 QR contract shipped** — DPC check-in next

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

DM1 session stub + DM2 activate/bind/unbind (database only, no Google/Apple HTTP). Merchant Web **enroll** page creates a session and shows the project DPC QR when the four `DPC_*` settings are present.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (D-057):** Android **custom DPC + Device Owner + QR** (no PC for normal customer enroll). iOS **Model B + vendor MDM + Configurator iPhone**. Device management **mandatory**. AMAPI is not the lock engine (D-054). Prototype ≠ commercial approval.

**Phase 1 software (done):** `NOT_STARTED` / `QR_GENERATED` on sessions; Android QR sets `QR_GENERATED`; `GET /api/v1/devices/:id` returns desired presentation `NONE`, platform state `NONE`, enrollment status, masked IMEI, `outstandingBalance: null` (no lock engine).

**Phase 2 software (QR contract, done):** Android QR extras name the project DPC from `DPC_COMPONENT_NAME`, `DPC_DOWNLOAD_URL`, `DPC_PACKAGE_CHECKSUM`, and `DPC_ENROLLMENT_ENDPOINT`. Missing or invalid settings leave the session unissued (`DPC_QR_NOT_CONFIGURED`). `POST /qr` rotates an `enc_` token and stores only the hash while status is `WAITING_FOR_DEVICE` or `QR_GENERATED`. Merchant Web can issue that QR again when the page is not holding a payload. Check-in route, Kotlin DPC, and any phone wipe are still later. **Ask before factory-resetting any phone.**

**Next software:** Phase 2 remainder — DPC check-in on an authorized lab device. **Do not** implement Phases 3–7 in that change. **Do not** claim production Device Owner.

**IOS-A (docs):** vendor MDM + Model B + Single App Mode (D-056). **IOS-B:** customer Flutter lock UI + `GET /me/lock-status`. Full MDM / SAM lab is Phase 5–6 and remains BLOCKED on Apple.

Hardware/Apple **production** proof remains BLOCKED. Google AMAPI inquiry is optional/historical, not the implementation path.

## Out of Scope (still)

Live Omise, refunds as a product feature, production MDM/DPC claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes, AMAPI overdue lock.
