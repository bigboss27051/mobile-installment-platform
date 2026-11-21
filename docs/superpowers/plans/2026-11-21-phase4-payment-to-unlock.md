# Phase 4 Payment-to-Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a **verified** sandbox payment webhook allocates successfully, recompute contract outstanding and, when unlock is warranted, set device desired policy and enqueue Android stop commands (never from unverified events).

**Architecture:** `PaymentUnlockOrchestrator` listens only to post-verify SUCCEEDED payment outcomes (same process, after webhook transaction commits). Policy helper maps outstanding → desired (`0` → `NONE`). Android adapter path reuses `DeviceCommandsService.enqueue` with system/actor + reason containing `paymentTransactionId` for idempotency. iOS out of scope.

**Tech Stack:** NestJS, Prisma, existing sandbox webhook + device_commands.

**Refs:** `docs/architecture/payment-to-unlock.md`, `device-lock-state-machine.md`

---

### Task 1: Policy helper (TDD)

**Files:**
- Create: `backend/src/devices/device-lock-policy.ts` (+ spec)

- [x] `desiredFromOutstanding(outstanding: Decimal): DesiredPresentation` — `0` → NONE; else keep current (Phase 4a: only auto-unlock to NONE when paid off; no auto-escalate)

### Task 2: Orchestrator (TDD)

**Files:**
- Create: `backend/src/devices/payment-unlock.orchestrator.ts` (+ spec)
- Modify: `devices.module.ts`, `payments.module.ts` / inject into PaymentsService

- [x] `onVerifiedPayment({ tenantId, contractId, paymentTransactionId, actorUserId? })`
- [x] Load ACTIVE binding for contract → device
- [x] Skip if no Android device / no binding
- [x] Compute outstanding; if not NONE target, no-op
- [x] If already desired NONE, no-op
- [x] Idempotent: skip if audit reason already contains `pay:${paymentTransactionId}`
- [x] Enqueue `STOP_LOCK_TASK` / `STOP_PACKAGE_SUSPEND` from current desired
- [x] Clear location via existing NONE path in enqueue

### Task 3: Wire webhook

**Files:**
- Modify: `payments.service.ts` (+ spec)

- [x] After successful non-replay SUCCEEDED webhook, call orchestrator (errors logged, do not fail payment)

### Task 4: Docs / backlog

- [x] CURRENT-PHASE Phase 4; TASK-BACKLOG R2-P4-001; API note

### Task 5: Pad E2E (lab)

- [x] Activate (check-in device) + bind → LOCK → sandbox pay outstanding 0 → STOP_LOCK_TASK acked / `mLockTaskModeState=NONE` (2026-11-21)
