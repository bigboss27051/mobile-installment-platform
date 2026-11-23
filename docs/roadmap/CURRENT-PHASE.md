# Current Phase: **Production readiness pack** (Stripe + ops docs) — R2 Android lab COMPLETE

**Previous:** R2 Android lab closeout (D-068) — **COMPLETE**. Stripe PromptPay adapter + OTP SMS port stub + deploy/DPC/legal packets (D-069) on `develop`.

## Scope (done)

Merchant Web (React) and Customer Android (Flutter) critical paths on real `/api/v1` APIs: staff apply → approve → contract → sandbox PromptPay intent; customer OTP sandbox login, contract/schedule visibility, customer-scoped sandbox intents. Live Omise/Opn remains BLOCKED without credentials.

DM1 session stub + DM2 activate/bind/unbind (database only, no Google/Apple HTTP). Merchant Web **enroll** page creates a session and shows the project DPC QR when the four `DPC_*` settings are present.

## Status

R1 installment core (R1a–R1f) delivered. **R2 Device** is a **Device Provisioning & Enrollment Platform** (see [MASTER-EXECUTION-PLAN.md](../project-management/MASTER-EXECUTION-PLAN.md)).

**Architecture (D-057):** Android **custom DPC + Device Owner + QR** (no PC for normal customer enroll). iOS **Model B + vendor MDM + Configurator iPhone**. Device management **mandatory**. AMAPI is not the lock engine (D-054). Prototype ≠ commercial approval.

**R2 Android lab closeout (2026-11-23, D-068):** Phases **1–4** software + Pad 6 lab evidence are treated as **Android lab COMPLETE**. Full recovery types (`REENROLL` / `REPLACE` / `UNENROLL` / `RELEASE` / `CONTRACT_CLOSE`) + Merchant Web recovery panel shipped. **Do not** claim production Device Owner, financing lock, multi-SKU Zero-touch, or commercial DM5. **Phases 5–6 (iOS)** and **Phase 7 (production validation)** remain open / BLOCKED on Apple + external proof.

### Phase history (Android lab — done)

**Phase 1 software (done):** `NOT_STARTED` / `QR_GENERATED` on sessions; Android QR sets `QR_GENERATED`; `GET /api/v1/devices/:id` returns desired presentation `NONE`, platform state `NONE`, enrollment status, masked IMEI, `outstandingBalance: null` (no lock engine).

**Phase 2 software (QR contract + check-in code, done):** Android QR extras name the project DPC from `DPC_COMPONENT_NAME`, `DPC_DOWNLOAD_URL`, `DPC_PACKAGE_CHECKSUM`, and `DPC_ENROLLMENT_ENDPOINT`. Missing or invalid settings leave the session unissued (`DPC_QR_NOT_CONFIGURED`). `POST /qr` rotates an `enc_` token and stores only the hash while status is `WAITING_FOR_DEVICE` or `QR_GENERATED`. Merchant Web can issue that QR again when the page is not holding a payload. `POST /api/v1/devices/enroll/check-in` accepts that token from a `QR_GENERATED` session and moves it to `ENROLLING` when `deviceOwner` is true. `apps/android-dpc` reads the QR extras and posts that check-in. Lab APK **0.1.2-lab** persists enrollment extras at `GET_PROVISIONING_MODE` / admin-enabled and check-ins from `ADMIN_POLICY_COMPLIANCE` before `RESULT_OK` (20s timeout). **Lab evidence (Xiaomi Pad 6 / pipa, Android 14):** QR Device Owner with **0.1.1-lab** succeeded; device check-in from installed **0.1.2-lab** via `LabProvisioningActivity` moved session `0d2141fb-…` → `ENROLLING` / device `705f8cff-…`. Full QR wipe re-test of auto compliance check-in still optional. **Ask before factory-resetting any phone.** Not production Device Owner / financing approval.

**Phase 3a–3g (lab done):** `device_commands` + policy states; Lock Task; package suspend; reboot HOME recovery; heartbeat; device list; lab HTTPS; soft location when RESTRICT/LOCK (D-061). Pad 6 evidence under `docs/device-management/lab-evidence/`.

**FRP / REENROLL (lab done):** SOP + Merchant FRP checklist (D-060); `REENROLL` recovery API; Welcome QR + LAN HTTPS proven 2026-11-22.

**Phase 4a–4e (lab done):** Payment-to-unlock; overdue evaluate + cron + ladder; merchant policy settings + lock approval queue; WorkManager + FCM poller; Teal/Sand DPC UI. Still lab only.

**Recovery surface (lab done, R2-P4-010):** All five recovery types auto-APPROVED with shared cleanup; Merchant Web **DeviceRecoveryPanel** on device status. No remote wipe from recovery API.

**Parallel track (R3-P0, D-066):** LINE installment comms sandbox — tenant OA config, webhook, customer linking, read-only installment replies, payment confirmation / manual reminder templates. Production LINE remains BLOCKED.

## Production readiness (2026-11-23)

- **Stripe PromptPay (D-069):** `PAYMENT_PROVIDER=stripe` + `POST /api/v1/webhooks/payments/stripe`. Put keys in env (never git). CI stays sandbox.
- **OTP:** `OTP_CHANNEL=sandbox|sms`; SMS uses `BlockedSmsAdapter` → `SMS_OTP_BLOCKED` until a real vendor adapter exists.
- **Ops:** [PRODUCTION-DEPLOY.md](../operations/PRODUCTION-DEPLOY.md), `backend/Dockerfile`.
- **DPC:** [DPC-HOSTING-CHECKLIST.md](../device-management/DPC-HOSTING-CHECKLIST.md), `scripts/dpc-apk-checksum.sh`; FRP shop-floor SOP expanded (no adb).
- **Legal:** [LEGAL-COUNSEL-PACKET.md](../device-management/LEGAL-COUNSEL-PACKET.md) — financing lock still **Unverified**.

## Next

- Human: Stripe Dashboard webhook → public HTTPS; counsel review of legal packet; multi-SKU lab (DM0-001); real SMS vendor.
- **R3** SaaS operations may proceed in parallel.
- **Phase 5–6 iOS:** **BLOCKED** on Apple ABM / MDM vendor (D-043).
- **Phase 7:** production validation — not claimed.

**Do not** claim production Device Owner or financing lock. **Skip iOS** until ABM + vendor credentials.

Hardware/Apple **production** proof remains BLOCKED. Google AMAPI inquiry is optional/historical, not the implementation path.

## Out of Scope (still)

Live Omise, refunds as a product feature, production MDM/DPC claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes, AMAPI overdue lock.
