# Lab evidence: WorkManager + FCM command poller (2026-11-22)

**Device:** Xiaomi Pad 6 (`1cb75234` / pipa), Android 14 — Device Owner `com.mip.dpc`  
**DPC:** `0.1.18-lab` (`versionCode` 18)  
**Lab only — not production Device Owner / financing.**

## Preconditions

| Item | Value |
|------|--------|
| `apiBase` | `https://192.168.68.108:3443/api/v1` (LAN HTTPS, lab CA pin) |
| `deviceId` | `705f8cff-6bfe-4b82-96c5-5c2a6bce1b05` |
| `fcm_token` (DB, masked) | `cjkq_lGFSMan…` (first 12 chars) |
| Backend | HTTP/HTTPS health **200**; `FCM_SERVICE_ACCOUNT_PATH` set (not logged) |
| Staff enqueue | `lab-owner-1795262154893@test.local` / `devices.command` |

`adb reverse --list` empty for agent traffic (same LAN path as prior HTTPS proof).

## Build / install

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd apps/android-dpc && ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

On-device: `versionName=0.1.18-lab`, `versionCode=18`.

## Test: FCM wake → WorkManager (no CommandPollActivity)

1. Agent session present in `mip_device_agent` SharedPreferences (post–Welcome QR check-in).
2. `adb shell am force-stop com.mip.dpc` — **did not** start `CommandPollActivity`.
3. Staff `POST /api/v1/devices/{id}/commands` → `START_LOCK_TASK`, reason `lab wm-fcm poller proof Task7`.

### Observed (within ~1s of enqueue)

| Layer | Evidence |
|-------|----------|
| Backend | `[FcmPushAdapter] FCM POLL_NOW → cjkq_lGF…` (masked server log) |
| Device | `WM-WorkerWrapper: Worker result SUCCESS … CommandPollWorker` |
| Command | `START_LOCK_TASK` → `ACKED_SUCCESS` |
| UX | `MpPayLockActivity` foreground; `mLockTaskModeState=LOCKED` |
| Heartbeat | `last_heartbeat_at` advanced to `2026-11-22T15:15:14.118Z` (worker path, not Activity UI) |

`CommandPollActivity` was **not** launched during the proof window (only launcher metadata lines from APK update).

## Cleanup

Staff `STOP_LOCK_TASK` (reason: lab cleanup) → `ACKED_SUCCESS` / `LOCK_TASK_STOPPED`; `device_policy_states` → desired `NONE`, platform `NONE`. No FCM on STOP (by design); ack via subsequent worker poll.

## Result

| Path | Result |
|------|--------|
| Restrictive enqueue → FCM `POLL_NOW` → `CommandPollWorker` | **Proven** |
| Command ack + Lock Task without foreground poller Activity | **Proven** |
| Agent heartbeat over LAN HTTPS without `adb reverse` | **Proven** (HB timestamp above) |

Spec: [../../superpowers/specs/2026-11-22-workmanager-fcm-poller-design.md](../../superpowers/specs/2026-11-22-workmanager-fcm-poller-design.md). Plan: [../../superpowers/plans/2026-11-22-workmanager-fcm-poller.md](../../superpowers/plans/2026-11-22-workmanager-fcm-poller.md).