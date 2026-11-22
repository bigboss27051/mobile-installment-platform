# MIP DPC (`0.1.18-lab`)

Lab Android Device Policy Controller (`com.mip.dpc`). **Not** production Device Owner / financing approval.

## What it does (lab)

- Reads enrollment extras from Enterprise QR / provisioning and POSTs check-in
- **Command delivery:** `CommandPollWorker` (WorkManager periodic + FCM `POLL_NOW` OneTime) via shared `CommandExecutor`; foreground `CommandPollActivity` optional for lab debugging
- Registers FCM via `PushTokenClient` → `POST /devices/agent/push-token`
- Polls/acks Lock Task (`MangoLockActivity`) and package suspend
- Reboot recovery via preferred HOME alias + policy GET
- Heartbeat (HTTPS preferred; lab CA pin) + soft location only under `RESTRICT` / `LOCK`
- **REMINDER:** overdue notification only — device stays usable (no suspend / lock-task)
- **LOCK:** Lock Task Mode + **Emergency call (112)** via `ACTION_DIAL` (dialer packages allowlisted)
- Lab-only wipe activity requires human `confirm=true` — does not clear Google FRP

Admin component: `com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver`

## Setup notes

Android 12+ QR Device Owner needs exported `GET_PROVISIONING_MODE` and `ADMIN_POLICY_COMPLIANCE`. Set `DPC_*` env on the API. Do not factory-reset a phone without asking. Do not put Wi-Fi passwords or secrets in the QR.

```bash
cd apps/android-dpc
./gradlew test
./gradlew assembleDebug
```