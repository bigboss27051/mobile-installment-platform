# Phase 3a — Lock Task Mode command loop (lab)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can enqueue `START_LOCK_TASK` / `STOP_LOCK_TASK` with reason + authz; the Device Owner DPC polls, applies Lock Task Mode (not `lockNow()`), and acks platform result.

**Architecture:** `device_commands` queue + `device_policy_states` desired vs platform. Device agent auth = one-time `agentToken` issued at check-in (hashed at rest). DPC never invents lock from local overdue clocks.

**Tech stack:** NestJS + Prisma, Kotlin DPC `DevicePolicyManager` Lock Task Mode, existing RBAC `PermissionsGuard`.

**Out of scope this slice:** package suspend, payment-to-unlock, FCM push, reboot recovery hardening, iOS, production claims.

## File map

| File | Responsibility |
|------|----------------|
| `backend/prisma/schema.prisma` | `DeviceCommand`, `DevicePolicyState`, `agentTokenHash` on `Device` |
| `backend/src/devices/device-commands.service.ts` | enqueue / poll / ack |
| `backend/src/devices/devices.controller.ts` (or new) | staff `POST .../commands` |
| `backend/src/devices/device-agent.controller.ts` | `GET/POST` agent command routes |
| `apps/android-dpc/.../MangoLockActivity.kt` | Lock Task UI shell |
| `apps/android-dpc/.../CommandPollWorker.kt` or activity loop | poll + ack |

## Tasks

### Task 1: Schema + check-in agent token

- [x] Migration: enums + tables + `devices.agent_token_hash`
- [x] Check-in returns `agentToken` once; store hash only
- [x] Unit tests for enqueue/poll/ack + check-in token

### Task 2: Staff enqueue command

- [x] Permission `devices.command`
- [x] `POST /api/v1/devices/:id/commands` `{ type, reason }` → `QUEUED`
- [x] Tenant isolation + reason required tests

### Task 3: Agent poll + ack

- [x] `GET /api/v1/devices/agent/commands` with `X-Device-Agent-Token`
- [x] `POST /api/v1/devices/agent/commands/:id/ack` `{ status, platformState }`
- [x] Updates `device_policy_states`; idempotent ack

### Task 4: DPC Lock Task

- [x] `MangoLockActivity` + allowlist lock-task packages
- [x] On `START_LOCK_TASK`: start activity + `startLockTask`; ack `LOCK_TASK`
- [x] On `STOP_LOCK_TASK`: `stopLockTask`; ack `NONE`
- [x] Lab: poll every N seconds when DO; no secrets in logs

### Task 5: Docs

- [x] Update `CURRENT-PHASE.md`, lab evidence note, TASK-BACKLOG `R2-P3-001`
