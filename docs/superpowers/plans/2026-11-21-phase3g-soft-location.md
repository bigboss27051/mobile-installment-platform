# Phase 3g Soft Location (Arrears-Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Android DPC to attach soft location to agent heartbeat only when desired policy is `RESTRICT` or `LOCK`, expose last-known + ≤14-day history to staff with `devices.location.read`, and purge on `NONE`/TTL.

**Architecture:** Extend existing heartbeat ingest; store last-known on `devices` + append-only `device_location_samples`. Server enforces desired-policy gate. DPC reads coarse/network location only when policy GET says RESTRICT/LOCK. Merchant Web shows coordinates text (no map).

**Tech Stack:** NestJS + Prisma (Decimal lat/lng), Kotlin DPC LocationManager, React Merchant Web.

**Spec:** `docs/superpowers/specs/2026-11-21-phase3g-soft-location-arrears-design.md` (D-061)

---

### Task 1: Schema + permission

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261121160000_phase3g_soft_location/migration.sql`
- Modify: `backend/src/common/authz/permissions.ts` (+ spec)

- [x] Add `DeviceLocationSource` enum; last-known columns on `Device`; `DeviceLocationSample` model; `LOCATION_READ` audit action
- [x] Add permission `devices.location.read` (OWNER + STAFF)
- [x] Migrate + `prisma generate`

### Task 2: Heartbeat location gate (TDD)

**Files:**
- Modify: `backend/src/devices/dto/agent-heartbeat.dto.ts`
- Modify: `backend/src/devices/device-commands.service.ts` (+ spec)
- Create: `backend/src/devices/device-location.service.ts` (+ spec) for persist/purge helpers

- [x] Reject `location` when desired NONE/REMINDER → `400 LOCATION_NOT_ALLOWED`
- [x] Accept + upsert last-known + append sample when RESTRICT/LOCK
- [x] Heartbeat without location still stamps `lastHeartbeatAt`
- [x] Purge samples + clear last-known when desired → NONE (enqueue STOP_*, recovery REENROLL)
- [x] `purgeOlderThan(14 days)` deletes stale samples

### Task 3: Staff APIs (TDD)

**Files:**
- Modify: `backend/src/devices/device-lifecycle.service.ts` (+ controller + specs)
- Modify: GET device DTO mapping for `lastKnownLocation` / `locationUpdatedAt`

- [x] `GET /devices/:id` includes nullable last-known
- [x] `GET /devices/:id/location-history` requires `devices.location.read`, tenant isolation, audit
- [x] Missing permission → 403 (PermissionsGuard)

### Task 4: DPC soft location

**Files:**
- Modify: `apps/android-dpc` manifest (ACCESS_COARSE_LOCATION), `HeartbeatClient`, `CommandPollActivity` / new `SoftLocationReader`
- Tests: JVM unit for payload builder if pure Kotlin

- [x] When cached/policy desired is RESTRICT|LOCK, attach location if available; never force GPS
- [x] Bump versionName to `0.1.16-lab`

### Task 5: Merchant Web

**Files:**
- Modify: `device-status-panel.tsx` (+ spec), `i18n.ts`

- [x] Show last-known when present
- [x] Optional history fetch behind same panel (fail soft on 403)

### Task 6: Docs

- [x] CURRENT-PHASE → 3g done/in progress; TASK-BACKLOG R2-P3-009; DECISION-LOG D-061 lab note; API doc snippet if present
