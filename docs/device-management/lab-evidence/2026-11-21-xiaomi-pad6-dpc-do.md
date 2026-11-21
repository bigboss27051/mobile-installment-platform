# Lab evidence: Xiaomi Pad 6 Device Owner (2026-11-21)

**Device:** Xiaomi Pad 6 (`23043RP34G` / `pipa_global`), Android 14  
**DPC:** `com.mip.dpc` versionName `0.1.1-lab` (GitHub release `v0.1.1-lab-dpc`)  
**Result:** Device Owner **YES** — `dpm list-owners` reported `com.mip.dpc/.MipDeviceAdminReceiver` (DeviceOwner, Affiliated). Zero Google accounts at check time.

**Enrollment session:** `f3c54e82-2188-45d8-b9e6-c3aba2b3b6bc`  
**After manual check-in:** status `ENROLLING`, deviceId `785e5c63-9e29-4a65-ba09-0f3b6fcd0c88` (`ENROLLED`).

**Gap (0.1.1-lab):** Setup Wizard reached Home without an automatic check-in (session stayed `QR_GENERATED` until a manual `POST /api/v1/devices/enroll/check-in`).

**Follow-up (0.1.2-lab):** DPC persists extras and check-ins before `ADMIN_POLICY_COMPLIANCE` `RESULT_OK`. Verified on-device check-in by launching `LabProvisioningActivity` with enrollment extras (session `0d2141fb-…` → `ENROLLING`, device `705f8cff-…`) while Device Owner remained `com.mip.dpc`. Full factory-reset QR path for auto compliance check-in not re-run in this note.

**Phase 3a lab (same day):** DPC `0.1.3-lab` + `device_commands`. With agent token + `adb reverse`, poller executed `START_LOCK_TASK` → command `ACKED_SUCCESS` / `LOCK_TASK_ACTIVE`, `device_policy_states.platform_state=LOCK_TASK`, `dumpsys` `mLockTaskModeState=LOCKED`, `MangoLockActivity` resumed. Used Lock Task Mode (not `lockNow()`).

**FRP after wipe (same day):** Factory reset of the Pad 6 removed Device Owner and Setup Wizard presented **Factory Reset Protection** (previous Google account) before a new QR Device Owner path could run. Documented in [FRP-AND-REENROLL.md](../FRP-AND-REENROLL.md) and plan `docs/superpowers/plans/2026-11-21-android-frp-after-wipe.md`. Platform cannot clear FRP remotely; unlock is Google account / out-of-band, then a **new** enrollment QR.

**Phase 3c real reboot (evening):** DPC `0.1.10-lab`+; desired `LOCK`. Cold reboot → `MangoLockActivity` resumed as HOME (`Intent MAIN/HOME`), `mLockTaskModeState=LOCKED`. MIUI blocks bare `BOOT_COMPLETED` activity starts / autostart; reliable path is **persistent preferred HOME** via `LockHomeAlias` while LOCK is authorized (cleared on NONE / STOP_LOCK_TASK). MIUI background-start appops `10020–10023` help FGS recovery when used. Lab then cleared HOME back to `com.miui.home/.launcher.Launcher` with desired `NONE`.

**Phase 3d / lab-target (evening):** DPC updated to `0.1.12-lab` (heartbeat from poller). Built `:lab-target` (`com.mip.labtarget`) for non-empty suspend. Fresh package sideload returned `INSTALL_FAILED_USER_RESTRICTED` on Pad 6 until on-device USB install is confirmed; not yet proven `PACKAGES_SUSPENDED` count > 0.

**Phase 3b non-empty suspend (evening, `0.1.13-lab`):** Root cause of empty suspend was Android 11+ package visibility (DPC could not see user apps). Fix: `QUERY_ALL_PACKAGES` + `MATCH_ALL`. PolicyRecovery desired=`RESTRICT` on Pad 6 set `suspended=true` for `cn.wps.xiaomi.abroad.lite` and `com.miui.mediaeditor`; then cleared with desired=`NONE`.

**Not claimed:** production Device Owner, financing lock, shop-ready command transport, Play-signed distribution, remote FRP unlock.
