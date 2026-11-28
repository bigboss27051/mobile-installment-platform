# WorkManager + FCM Poller (Approach B) Design

**Date:** 2026-11-22  
**Status:** Implemented (lab Pad 6 E2E 2026-11-22; DPC `0.1.18-lab`)  
**Parent:** R2 Android lab agent transport  
**Depends on:** Phase 3a–3d command/heartbeat loop, LAN HTTPS agent (lab), Device Owner check-in  
**Scope choice:** User approved **Approach 1** — Periodic WorkManager + FCM wake on restrictive enqueue only (not every command; not FCM-only)

## Goal

Replace reliance on a foreground `CommandPollActivity` loop for shop-relevant command delivery: the DPC runs **periodic** poll/heartbeat/ack via WorkManager, and the backend **wakes** the device with an FCM data message when a **restrictive** command is enqueued (`START_LOCK_TASK`, `START_PACKAGE_SUSPEND`).

## Non-Goals

- FCM wake on `STOP_*`, REMINDER-only, or every command type  
- Foreground Service always-on poller  
- Production Play-signed DPC / commercial FCM quotas  
- iOS APNs  
- Notification tray UI for wake (data-only)  
- Committing Firebase Admin private keys or embedding Admin SDK in the APK  
- Fixing Welcome QR auto check-in (separate)

## Decisions

| ID | Decision |
|----|----------|
| W-1 | Periodic WorkManager is the baseline poll path (~15 minutes minimum interval per WM) |
| W-2 | FCM data message `type=POLL_NOW` after successful enqueue of **any** Android device command (START and STOP). Amended by D-075 — STOP previously waited for periodic WM only |
| W-3 | FCM send is best-effort: enqueue/command path must not fail if push fails or token missing |
| W-4 | `CommandPollActivity` remains lab debug UI; not required for lock/restrict delivery after this slice |
| W-5 | Firebase project lab: `mip-dev-9f7aa`; Android app `com.mip.dpc` via `google-services.json` |
| W-6 | Admin SDK credentials via env path only (`FCM_SERVICE_ACCOUNT_PATH`); gitignored |
| W-7 | DPC version bump to `0.1.18-lab` |

## Architecture

```
Backend commands.enqueue(START_LOCK|START_SUSPEND)
        │
        ├─ persist command (existing)
        └─ best-effort FcmPushAdapter.sendPollNow(fcmToken)
                │
                ▼
         FCM data message ──► MipFirebaseMessagingService
                                    │
                                    ▼
                           OneTimeWork → CommandPollWorker
                                    │
PeriodicWork (~15m) ───────────────►│
                                    ▼
                    policy GET → heartbeat → poll → ack
                    (same command handlers as today; extract shared executor)
```

## Android (DPC)

| Component | Responsibility |
|-----------|----------------|
| `CommandPollWorker` | Shared poll cycle: load `AgentTokenStore`, policy fetch/cache, heartbeat, poll commands, execute + ack. Start `MpPayLockActivity` with `FLAG_ACTIVITY_NEW_TASK` when applying `START_LOCK_TASK`. |
| `CommandPollScheduler` | After successful check-in (and app start if session present): `enqueueUniquePeriodicWork` with network constraint. |
| `MipFirebaseMessagingService` | On data message `POLL_NOW`, enqueue unique/expedited OneTimeWork for `CommandPollWorker`. No notification. |
| Token sync | After check-in + `onNewToken`: `POST /devices/agent/push-token` with agent header. |
| `CommandPollActivity` | Optional lab UI; may call the same executor or keep short Handler loop for debug. |
| Config | Place `google-services.json` under `apps/android-dpc/app/`. Add WorkManager + Firebase Messaging deps; apply Google Services plugin. |

Extract command handling from `CommandPollActivity` into a Context-based helper (e.g. `CommandExecutor`) so Worker and Activity do not diverge.

## Backend

| Piece | Behavior |
|-------|----------|
| Migration | `devices.fcm_token` (nullable text), `devices.fcm_token_updated_at` (nullable timestamptz) |
| `POST /api/v1/devices/agent/push-token` | Body `{ "token": string }` (non-empty). Auth: `X-Device-Agent-Token`. Updates only the device bound to that agent token. Tenant isolation via device row. |
| `FcmPushAdapter` | Init from `FCM_SERVICE_ACCOUNT_PATH`. If unset: no-op logger. `sendPollNow(token)` sends data-only payload. |
| Hook | In command enqueue service after successful create: if `fcm_token` present → `sendPollNow` (catch/log errors). Applies to START and STOP (D-075). |
| Env | `.env.example`: `FCM_SERVICE_ACCOUNT_PATH=` comment. Root Admin JSON gitignored (e.g. `*-firebase-adminsdk-*.json`). |

## Security / PDPA / lab hygiene

- No secrets in QR; no Admin SDK in APK.  
- FCM token is a device push identifier — treat as sensitive in logs (mask).  
- Webhook/payment unlock still never applies locks from unverified payments (unchanged); this slice only wakes poll after **authorized** command enqueue.  
- Do not commit `mip-dev-*-firebase-adminsdk-*.json`.

## Lab acceptance

| Gate | Pass |
|------|------|
| Periodic | With agent session and Activity **not** in foreground, `last_heartbeat_at` advances within one WM period (or forced OneTimeWork for lab) |
| FCM wake | Enqueue `START_LOCK_TASK` → device receives data message → worker runs → command acked / Lock Task without opening `CommandPollActivity` first |
| Unlock wake | Enqueue `STOP_LOCK_TASK` / `STOP_PACKAGE_SUSPEND` also sends FCM when token present (D-075); periodic WM remains fallback |
| Secrets | Admin JSON untracked; app builds with `google-services.json` |

## Docs to update when done

- `docs/roadmap/CURRENT-PHASE.md`  
- `docs/project-management/TASK-BACKLOG.md` (`R2-P4-008` or similar)  
- `apps/android-dpc/README.md`  
- Lab evidence note under `docs/device-management/lab-evidence/` when Pad proven  

## Out of scope claims

Lab only. Do not claim production Device Owner, guaranteed sub-minute wake on all OEMs, or Play-distributed FCM readiness.
