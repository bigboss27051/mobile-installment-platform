# WorkManager + FCM Poller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DPC polls via WorkManager (periodic + FCM-triggered OneTime) so restrictive commands do not require `CommandPollActivity` in the foreground; backend registers FCM tokens and best-effort wakes on `START_LOCK_TASK` / `START_PACKAGE_SUSPEND`.

**Architecture:** Extract shared `CommandExecutor` from `CommandPollActivity`. `CommandPollWorker` + `CommandPollScheduler` + `MipFirebaseMessagingService` on Android (`0.1.18-lab`). Backend adds `devices.fcm_token`, `POST .../agent/push-token`, and `FcmPushAdapter` hooked after restrictive enqueue. Admin SDK path via `FCM_SERVICE_ACCOUNT_PATH` only (gitignored).

**Tech Stack:** NestJS + Prisma, Firebase Admin (Node), AndroidX WorkManager, Firebase Cloud Messaging, Kotlin DPC.

**Spec:** [../specs/2026-11-22-workmanager-fcm-poller-design.md](../specs/2026-11-22-workmanager-fcm-poller-design.md)

**Commits:** Only if the user asks (project user rule).

---

## File map

| Path | Role |
|------|------|
| `backend/prisma/schema.prisma` + migration | `fcm_token`, `fcm_token_updated_at` |
| `backend/src/devices/fcm-push.adapter.ts` | Send data `POLL_NOW` or no-op |
| `backend/src/devices/device-commands.service.ts` | After enqueue restrictive → wake |
| `backend/src/devices/device-agent.controller.ts` | `POST agent/push-token` |
| `backend/src/devices/*.spec.ts` | Unit tests |
| `.gitignore` / `.env.example` | Ignore admin SDK; document env |
| `apps/android-dpc/app/google-services.json` | From Downloads (package `com.mip.dpc`) |
| `apps/android-dpc/app/.../CommandExecutor.kt` | Shared poll + command handle |
| `apps/android-dpc/app/.../CommandPollWorker.kt` | Worker |
| `apps/android-dpc/app/.../CommandPollScheduler.kt` | Periodic enqueue |
| `apps/android-dpc/app/.../MipFirebaseMessagingService.kt` | FCM → OneTimeWork |
| `apps/android-dpc/app/.../PushTokenClient.kt` | Register token with agent header |
| `CommandPollActivity.kt` / check-in activities | Call scheduler + shared executor |
| Gradle / manifest | WM + FCM deps, service, version `0.1.18-lab` |
| Docs | CURRENT-PHASE, backlog `R2-P4-008`, DPC README, lab evidence when proven |

---

### Task 1: Secrets hygiene + google-services

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`
- Copy: `apps/android-dpc/app/google-services.json` from `/Users/tanawutmeesubprung/Downloads/google-services (6).json`
- Do **not** commit Admin SDK JSON; point `.env` locally only

- [ ] **Step 1: Gitignore Admin SDK + optional google-services if team prefers**

Add to `.gitignore`:

```
*-firebase-adminsdk-*.json
mip-dev-*-firebase-adminsdk-*.json
```

(`google-services.json` for lab may be committed as client config without private keys — keep Admin SDK out.)

- [ ] **Step 2: Copy google-services.json**

```bash
cp "/Users/tanawutmeesubprung/Downloads/google-services (6).json" \
  apps/android-dpc/app/google-services.json
```

Verify `package_name` is `com.mip.dpc` and `project_id` is `mip-dev-9f7aa`.

- [ ] **Step 3: `.env.example`**

```bash
# Lab FCM (Firebase Admin SDK JSON path). Unset = push no-op; periodic WM still works.
# FCM_SERVICE_ACCOUNT_PATH=./mip-dev-9f7aa-firebase-adminsdk-….json
```

- [ ] **Step 4: Local `.env` only (do not commit)**

```bash
FCM_SERVICE_ACCOUNT_PATH=/Users/tanawutmeesubprung/Documents/mobile-installment-platform/mip-dev-9f7aa-firebase-adminsdk-fbsvc-932e004bdc.json
```

---

### Task 2: Prisma fcm_token + push-token API (TDD)

**Files:**
- Modify: `backend/prisma/schema.prisma` (`Device` model)
- Create: migration `backend/prisma/migrations/YYYYMMDDHHMMSS_device_fcm_token/migration.sql`
- Modify: `backend/src/devices/device-agent.controller.ts`
- Create or modify service method on agent/commands service for `registerPushToken`
- Test: `backend/src/devices/device-agent-push-token.spec.ts` (or extend existing agent spec)

- [ ] **Step 1: Failing test — register token**

```typescript
it('stores fcm token for device resolved by agent token', async () => {
  // arrange device with agentTokenHash
  // call registerPushToken(rawAgentToken, 'fcm-abc')
  // expect prisma.device.update with fcmToken 'fcm-abc'
});

it('rejects empty token', async () => {
  await expect(registerPushToken(raw, '  ')).rejects.toThrow(/* BadRequest */);
});
```

- [ ] **Step 2: Schema**

```prisma
fcmToken          String?   @map("fcm_token")
fcmTokenUpdatedAt DateTime? @map("fcm_token_updated_at")
```

- [ ] **Step 3: Migration SQL**

```sql
ALTER TABLE "devices" ADD COLUMN "fcm_token" TEXT;
ALTER TABLE "devices" ADD COLUMN "fcm_token_updated_at" TIMESTAMP(3);
```

- [ ] **Step 4: Implement `POST /api/v1/devices/agent/push-token`**

Same auth pattern as heartbeat (`X-Device-Agent-Token`). Body DTO `{ token: string }`. Update only the matching device row.

- [ ] **Step 5: Run unit tests**

```bash
cd backend && npm test -- --testPathPattern=device-agent-push-token
```

Expected: PASS

---

### Task 3: FcmPushAdapter + restrictive enqueue hook (TDD)

**Files:**
- Create: `backend/src/devices/fcm-push.adapter.ts`
- Create: `backend/src/devices/fcm-push.adapter.spec.ts`
- Modify: `backend/src/devices/device-commands.service.ts` (+ module providers)
- Modify: `backend/src/devices/device-commands.service.spec.ts`
- Add dependency: `firebase-admin` in `backend/package.json`

- [ ] **Step 1: Adapter unit tests**

```typescript
it('sendPollNow is no-op when FCM_SERVICE_ACCOUNT_PATH unset', async () => {
  const adapter = new FcmPushAdapter(/* config without path */);
  await expect(adapter.sendPollNow('tok')).resolves.toBeUndefined();
});

it('sendPollNow calls messaging with data type POLL_NOW when initialized', async () => {
  // mock firebase-admin messaging.send
});
```

- [ ] **Step 2: Implement adapter**

```typescript
// Pseudo
async sendPollNow(token: string): Promise<void> {
  if (!this.messaging || !token.trim()) return;
  await this.messaging.send({
    token,
    data: { type: 'POLL_NOW' },
  });
}
```

Mask token in logs (prefix only).

- [ ] **Step 3: Hook after successful enqueue**

In `DeviceCommandsService.enqueue`, after transaction commits successfully, if `input.type` is `START_LOCK_TASK` or `START_PACKAGE_SUSPEND`, read `device.fcmToken` (re-fetch or include in find) and:

```typescript
void this.fcm.sendPollNow(device.fcmToken).catch((err) => this.logger.warn(...));
```

Do **not** throw from enqueue if FCM fails.

- [ ] **Step 4: Spec — restrictive calls adapter; STOP does not**

Extend `device-commands.service.spec.ts` with mocked `FcmPushAdapter`.

- [ ] **Step 5: Run tests**

```bash
cd backend && npm test -- --testPathPattern='device-commands.service|fcm-push'
```

---

### Task 4: Android Gradle + WorkManager + FCM wiring

**Files:**
- Modify: `apps/android-dpc/build.gradle.kts` / root plugins — Google Services classpath if needed
- Modify: `apps/android-dpc/app/build.gradle.kts` — deps, `versionName = "0.1.18-lab"`, `versionCode = 18`, `id("com.google.gms.google-services")`
- Modify: `apps/android-dpc/app/src/main/AndroidManifest.xml` — `MipFirebaseMessagingService`
- Create: classes below in Task 5–6

- [ ] **Step 1: Dependencies (app)**

```kotlin
implementation("androidx.work:work-runtime-ktx:2.9.1")
implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
implementation("com.google.firebase:firebase-messaging-ktx")
```

Apply plugin: `id("com.google.gms.google-services")`

- [ ] **Step 2: Manifest service**

```xml
<service
    android:name=".MipFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

- [ ] **Step 3: Sync / assemble**

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd apps/android-dpc && ./gradlew :app:assembleDebug
```

Expected: BUILD SUCCESSFUL

---

### Task 5: CommandExecutor + CommandPollWorker + Scheduler

**Files:**
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/CommandExecutor.kt`
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/CommandPollWorker.kt`
- Create: `apps/android-dpc/app/src/main/java/com/mip/dpc/CommandPollScheduler.kt`
- Modify: `CommandPollActivity.kt` — delegate to executor (optional thin UI)
- Modify: `LabProvisioningActivity.kt` / `AdminPolicyComplianceActivity.kt` — after successful check-in + `AgentTokenStore.save`, call `CommandPollScheduler.ensurePeriodic(context)` and `PushTokenClient.registerIfPossible`
- Test: pure helpers if any; Worker hard to unit-test without Robolectric — keep logic in `CommandExecutor` and unit-test non-Android pieces where possible

- [ ] **Step 1: Extract `CommandExecutor.runOnce(context): PollResult`**

Move policy/heartbeat/poll/handle from `CommandPollActivity` into `CommandExecutor`. For `START_LOCK_TASK`:

```kotlin
context.startActivity(
  Intent(context, MpPayLockActivity::class.java)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    .putExtra(MpPayLockActivity.EXTRA_REASON, command.reason),
)
```

- [ ] **Step 2: `CommandPollWorker`**

```kotlin
class CommandPollWorker(appContext: Context, params: WorkerParameters) :
  CoroutineWorker(appContext, params) {
  override suspend fun doWork(): Result {
    return try {
      CommandExecutor.runOnce(applicationContext)
      Result.success()
    } catch (_: Exception) {
      Result.retry()
    }
  }
}
```

- [ ] **Step 3: `CommandPollScheduler`**

```kotlin
fun ensurePeriodic(context: Context) {
  val req = PeriodicWorkRequestBuilder<CommandPollWorker>(15, TimeUnit.MINUTES)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .build()
  WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "mip_command_poll",
    ExistingPeriodicWorkPolicy.KEEP,
    req,
  )
}

fun enqueueNow(context: Context) {
  WorkManager.getInstance(context).enqueueUniqueWork(
    "mip_command_poll_now",
    ExistingWorkPolicy.REPLACE,
    OneTimeWorkRequestBuilder<CommandPollWorker>().build(),
  )
}
```

- [ ] **Step 4: Wire Activity + check-in**

`CommandPollActivity` can still tick UI but should call `CommandExecutor` (or enqueueNow). After check-in save session → `ensurePeriodic`.

---

### Task 6: FCM service + PushTokenClient

**Files:**
- Create: `MipFirebaseMessagingService.kt`
- Create: `PushTokenClient.kt`
- Modify: check-in success paths + `onNewToken`

- [ ] **Step 1: Messaging service**

```kotlin
override fun onMessageReceived(message: RemoteMessage) {
  if (message.data["type"] == "POLL_NOW") {
    CommandPollScheduler.enqueueNow(applicationContext)
  }
}

override fun onNewToken(token: String) {
  PushTokenClient.register(applicationContext, token)
}
```

- [ ] **Step 2: PushTokenClient**

POST `{ "token": "..." }` to `session.apiBase + "/devices/agent/push-token"` with `X-Device-Agent-Token`. Swallow errors (best-effort). After check-in, `FirebaseMessaging.getInstance().token.addOnSuccessListener { register(...) }`.

- [ ] **Step 3: Assemble + install on Pad**

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

### Task 7: Lab proof + docs

**Files:**
- Modify: `docs/roadmap/CURRENT-PHASE.md`
- Modify: `docs/project-management/TASK-BACKLOG.md` — `R2-P4-008` DONE when proven
- Modify: `apps/android-dpc/README.md`
- Create: `docs/device-management/lab-evidence/2026-11-22-workmanager-fcm-poller.md` (when Pad proven)
- Spec status → Implemented

- [ ] **Step 1: Lab — register token**

Confirm DB `fcm_token` set after install/check-in (mask in evidence).

- [ ] **Step 2: Lab — FCM wake**

Force-stop DPC UI; do **not** open `CommandPollActivity`. Staff enqueue `START_LOCK_TASK`. Expect worker ack / Lock Task within seconds–tens of seconds.

- [ ] **Step 3: Lab — periodic or forced OneTime**

`adb shell am broadcast` not required; can `CommandPollScheduler.enqueueNow` via small lab intent or wait WM. Record `last_heartbeat_at` without Activity.

- [ ] **Step 4: Docs** — no production DO claim.

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| Periodic WM | Tasks 4–5 |
| FCM POLL_NOW on restrictive only | Tasks 3, 6–7 |
| Best-effort push | Task 3 |
| push-token API + schema | Task 2 |
| Secrets hygiene | Task 1 |
| Lab Activity optional | Tasks 5, 7 |
| Docs / 0.1.18-lab | Tasks 4, 7 |

No TBDs. Commits only on user request.
