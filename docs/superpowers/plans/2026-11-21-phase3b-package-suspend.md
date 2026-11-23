# Phase 3b — Package suspend (RESTRICT)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Checkbox tasks.

**Goal:** Staff can enqueue `START_PACKAGE_SUSPEND` / `STOP_PACKAGE_SUSPEND` with reason + authz; DPC applies `DevicePolicyManager.setPackagesSuspended` (not process kill); acks `PACKAGES_SUSPENDED` or `UNSUPPORTED`. Emergency / dialer / this DPC stay unsuspended.

**Out of scope:** payment-to-unlock, FCM, reboot recovery (Phase 3c), iOS, production claims.

**Checkpoint note:** Phase 3a + FRP docs already on `develop` (`32c7590` and parents). This plan continues from that clean tree.

## File map

| File | Role |
|------|------|
| `backend/prisma/schema.prisma` | Add command enum values |
| `backend/src/devices/device-commands.service.ts` | Map suspend → desired `RESTRICT` |
| `apps/android-dpc/.../PackageSuspendHelper.kt` | Suspend/unsuspend allowlist |
| `apps/android-dpc/.../CommandPollActivity.kt` | Handle new command types |

## Tasks

### Task 1: Schema + desired mapping

- [x] Enum: `START_PACKAGE_SUSPEND`, `STOP_PACKAGE_SUSPEND`
- [x] Enqueue: START → `RESTRICT` / PENDING; STOP → `NONE` / PENDING
- [x] Ack: preserve desired from command type; platform from device ack
- [x] Unit tests

### Task 2: DPC suspend

- [x] Helper: list user-installed packages minus allowlist (dialer, messaging, mip.dpc, settings)
- [x] `START_PACKAGE_SUSPEND` → `setPackagesSuspended(..., true)`; ack `PACKAGES_SUSPENDED` (or `NONE` if no targets)
- [x] `STOP_PACKAGE_SUSPEND` → unsuspend; ack `NONE`
- [x] Not DO → `UNSUPPORTED`
- [x] Bump DPC `0.1.4-lab`

### Task 3: Lab + docs

- [x] Pad 6: enqueue + poll → `ACKED_SUCCESS` / `NO_PACKAGES_TO_SUSPEND:0` / desired `RESTRICT` / platform `NONE` (no third-party targets on this DO image)
- [x] Follow-up `0.1.13-lab`: `QUERY_ALL_PACKAGES` → Pad 6 non-empty suspend (`cn.wps…`, `com.miui.mediaeditor` `suspended=true`)
- [x] CURRENT-PHASE / backlog `R2-P3-002`
