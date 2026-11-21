# Current Phase: **Phase 3a Lock Task command loop (lab)**

**Previous:** R1f Merchant Web + Customer Android critical paths — **COMPLETE** on `develop`

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

DM1 session stub + DM2 activate/bind/unbind (database only, no Google/Apple HTTP). Merchant Web **enroll** page creates a session and shows the project DPC QR when the four `DPC_*` settings are present.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (D-057):** Android **custom DPC + Device Owner + QR** (no PC for normal customer enroll). iOS **Model B + vendor MDM + Configurator iPhone**. Device management **mandatory**. AMAPI is not the lock engine (D-054). Prototype ≠ commercial approval.

**Phase 1 software (done):** `NOT_STARTED` / `QR_GENERATED` on sessions; Android QR sets `QR_GENERATED`; `GET /api/v1/devices/:id` returns desired presentation `NONE`, platform state `NONE`, enrollment status, masked IMEI, `outstandingBalance: null` (no lock engine).

**Phase 2 software (QR contract + check-in code, done):** Android QR extras name the project DPC from `DPC_COMPONENT_NAME`, `DPC_DOWNLOAD_URL`, `DPC_PACKAGE_CHECKSUM`, and `DPC_ENROLLMENT_ENDPOINT`. Missing or invalid settings leave the session unissued (`DPC_QR_NOT_CONFIGURED`). `POST /qr` rotates an `enc_` token and stores only the hash while status is `WAITING_FOR_DEVICE` or `QR_GENERATED`. Merchant Web can issue that QR again when the page is not holding a payload. `POST /api/v1/devices/enroll/check-in` accepts that token from a `QR_GENERATED` session and moves it to `ENROLLING` when `deviceOwner` is true. `apps/android-dpc` reads the QR extras and posts that check-in. Lab APK **0.1.2-lab** persists enrollment extras at `GET_PROVISIONING_MODE` / admin-enabled and check-ins from `ADMIN_POLICY_COMPLIANCE` before `RESULT_OK` (20s timeout). **Lab evidence (Xiaomi Pad 6 / pipa, Android 14):** QR Device Owner with **0.1.1-lab** succeeded; device check-in from installed **0.1.2-lab** via `LabProvisioningActivity` moved session `0d2141fb-…` → `ENROLLING` / device `705f8cff-…`. Full QR wipe re-test of auto compliance check-in still optional. **Ask before factory-resetting any phone.** Not production Device Owner / financing approval.

**Phase 3a (lab, in progress):** `device_commands` + `device_policy_states`; staff `POST /devices/:id/commands` (`devices.command`); agent poll/ack with `dat_` token from check-in; DPC `0.1.3-lab` Lock Task Mode (`MangoLockActivity`, not `lockNow()`). **Pad 6 evidence:** `START_LOCK_TASK` → `ACKED_SUCCESS` / `LOCK_TASK` / `mLockTaskModeState=LOCKED`.

**FRP gate (lab, 2026-11-21):** Pad 6 factory reset removed Device Owner and Setup Wizard showed **Factory Reset Protection** before a new QR could run. SOP + D-060: [FRP-AND-REENROLL.md](../device-management/FRP-AND-REENROLL.md), plan `docs/superpowers/plans/2026-11-21-android-frp-after-wipe.md`, backlog `R2-P2-002`. Unlock FRP with the previous Google account (out of band) → **new** QR; platform does not clear FRP remotely. Prefer FRP-free lab stock next wipe.

**Merchant Web FRP checklist (done):** Android enroll page requires three staff attestations before create session / Issue QR (FRP cleared or N/A, new QR after wipe, no remote bypass) — D-060 copy; cannot clear FRP from UI.

**Next:** REENROLL path + lab re-prove after FRP unlocked on Pad 6 (`R2-P2-002` remainder); then harden agent auth/tunnel; package suspend (RESTRICT); reboot recovery; payment-to-unlock later. **Do not** claim production Device Owner or financing lock.

**IOS-A (docs):** vendor MDM + Model B + Single App Mode (D-056). **IOS-B:** customer Flutter lock UI + `GET /me/lock-status`. Full MDM / SAM lab is Phase 5–6 and remains BLOCKED on Apple.

Hardware/Apple **production** proof remains BLOCKED. Google AMAPI inquiry is optional/historical, not the implementation path.

## Out of Scope (still)

Live Omise, refunds as a product feature, production MDM/DPC claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes, AMAPI overdue lock.
