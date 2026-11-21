# Current Phase: **Phase 3f HTTPS agent host (lab)**

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

**REENROLL API (done):** `POST /api/v1/devices/:id/recovery-requests` `{ type: REENROLL, reason }` cancels open sessions, clears `agentTokenHash`, expires open lock commands, resets policy to `NONE`, audits `RECOVERY`. Create enrollment no longer blocked by stale `RECOVERY_REQUIRED` sessions.

**Lab note:** Pad 6 still shows Device Owner via adb — full wipe→FRP→QR re-prove needs **explicit wipe approval** (Task 6).

**Phase 3b (lab):** Commands `START_PACKAGE_SUSPEND` / `STOP_PACKAGE_SUSPEND` → desired `RESTRICT` / `NONE`. DPC `0.1.4-lab` uses `setPackagesSuspended` (allowlist keeps dialer/messages/`com.mip.dpc`). Pad 6: poller `ACKED_SUCCESS` with `NO_PACKAGES_TO_SUSPEND:0` and honest `platform_state=NONE` (no non-system targets on this image). Plan: `docs/superpowers/plans/2026-11-21-phase3b-package-suspend.md`.

**Phase 3c (lab, reboot proven):** `GET /devices/agent/policy`; DPC `0.1.11-lab` boot recovery + **`LockHomeAlias` persistent HOME** while desired=`LOCK`. **Pad 6 cold reboot:** HOME Intent landed on `MangoLockActivity`, `mLockTaskModeState=LOCKED`. MIUI autostart/`BOOT_COMPLETED` alone is unreliable; preferred HOME is the shop-relevant path. Plan: `docs/superpowers/plans/2026-11-21-phase3c-reboot-recovery.md`.

**Phase 3d (lab):** `POST /devices/agent/heartbeat` + `devices.last_heartbeat_at`; staff `GET /devices/:id` returns live `desiredPresentation` / `platformState` / `policyVersion` / `lastHeartbeatAt` (not hardcoded NONE); `GET /devices/:id/heartbeat` freshness (`410` if never). DPC `0.1.12-lab` posts heartbeat from command poller; `AgentApiBase` prefers HTTPS (lab cleartext allowed). Merchant Web device status panel after bind. Plan: `docs/superpowers/plans/2026-11-21-phase3d-agent-heartbeat.md`.

**Lab suspend (proven):** DPC `0.1.13-lab` adds `QUERY_ALL_PACKAGES` + `MATCH_ALL` so RESTRICT can see user apps (Android 11+ visibility). Pad 6: PolicyRecovery `RESTRICT` → `cn.wps.xiaomi.abroad.lite` and `com.miui.mediaeditor` `suspended=true`; cleared back to `NONE`. Module `:lab-target` still available; MIUI new-package sideload may need on-device USB confirm.

**Merchant Web:** after bind, device status panel + **command enqueue** UI (reason required; queued ≠ executed).

**E2E (Pad 6, same evening):** `START_PACKAGE_SUSPEND` → `ACKED_SUCCESS` / `PACKAGES_SUSPENDED:3`; `STOP_PACKAGE_SUSPEND` → `PACKAGES_UNSUSPENDED:3`. HTTPS lab notes: [AGENT-HTTPS-LAB.md](../device-management/AGENT-HTTPS-LAB.md).

**Phase 3e:** Staff `GET /api/v1/devices` (tenant-scoped, masked IMEI, policy + heartbeat). Merchant Web **Devices** page opens status + command panel.

**Phase 3f (lab HTTPS):** Nest dual listen HTTP + HTTPS (`TLS_*` / `HTTPS_PORT`); `scripts/generate-lab-https-certs.sh`; DPC `0.1.14-lab` pins lab CA. **Pad 6:** agent heartbeat over `https://127.0.0.1:3443` via `adb reverse` updated `last_heartbeat_at`. LAN Wi‑Fi HTTPS still optional when Pad/Mac share L2 + firewall allows `:3443`. Docs: [AGENT-HTTPS-LAB.md](../device-management/AGENT-HTTPS-LAB.md).

**Wipe/FRP:** not run this slice — **explicit wipe approval required** before factory reset / FRP re-prove.

**Next:** same-subnet LAN HTTPS proof (optional); wipe/FRP only with approval; then payment-to-unlock when command loop + HTTPS stay solid. **Do not** claim production Device Owner or financing lock. **Skip iOS** this usage window.

**IOS-A (docs):** vendor MDM + Model B + Single App Mode (D-056). **IOS-B:** customer Flutter lock UI + `GET /me/lock-status`. Full MDM / SAM lab is Phase 5–6 and remains BLOCKED on Apple.

Hardware/Apple **production** proof remains BLOCKED. Google AMAPI inquiry is optional/historical, not the implementation path.

## Out of Scope (still)

Live Omise, refunds as a product feature, production MDM/DPC claims, Stripe-as-PromptPay-primary, Super Admin / Merchant Mobile / DPC scaffolding in one change, requiring Play Protect disable, putting secrets in QR codes, AMAPI overdue lock.
