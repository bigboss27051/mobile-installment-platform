# Phase 3c — Reboot recovery (re-apply authorized policy)

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans.

**Goal:** After device reboot, DPC re-applies the **last authorized** desired presentation (RESTRICT → package suspend, LOCK → Lock Task). Never escalates. Never wipes. Never invents overdue lock from local clocks.

**Architecture:** Server `device_policy_states` is source of truth. Agent `GET /devices/agent/policy`. DPC also caches last ack locally. `BOOT_COMPLETED` → fetch policy → re-apply → poll pending commands.

**Out of scope:** payment-to-unlock, FCM, FRP wipe, production claims.

## Tasks

### Task 1: Agent policy read API

- [x] `GET /api/v1/devices/agent/policy` with `X-Device-Agent-Token`
- [x] Returns `{ deviceId, desiredPresentation, platformState, policyVersion }`
- [x] Missing state → `NONE` / `NONE` / version 0
- [x] Unit tests

### Task 2: DPC recovery

- [x] `PolicyCacheStore` update on successful command ack
- [x] `BootCompletedReceiver` + `PolicyRecoveryActivity`
- [x] Re-apply: LOCK → MangoLock; RESTRICT → PackageSuspendHelper; NONE → unsuspend best-effort
- [x] Start command poll after re-apply (skipped when desired=LOCK so Mango Lock stays on top)
- [x] DPC `0.1.5-lab`

### Task 3: Docs

- [x] CURRENT-PHASE, backlog `R2-P3-003`, lab note
- [x] Pad 6 **cold reboot** → `MangoLockActivity` as HOME + `mLockTaskModeState=LOCKED` via persistent preferred HOME / `LockHomeAlias` (MIUI autostart alone insufficient)
