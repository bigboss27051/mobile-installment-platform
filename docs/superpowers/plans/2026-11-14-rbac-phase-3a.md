# RBAC Phase 3a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission codes + `PermissionsGuard` on critical mutating device/application/contract routes using OWNER/STAFF/SUPER_ADMIN bundles.

**Architecture:** Static role→permission map; Nest metadata decorator; guard after JWT. No schema change. No new roles. No branch scope yet.

**Tech Stack:** NestJS guards, Reflector, Jest unit + e2e

**Spec:** `docs/superpowers/specs/2026-11-14-rbac-phase-3a-design.md`

---

### Task 1: Permission map + unit tests

**Files:**
- Create: `backend/src/common/authz/permissions.ts`
- Create: `backend/src/common/authz/permissions.spec.ts`

- [x] Write failing tests for OWNER has unbind, STAFF lacks unbind, unknown role empty
- [x] Implement `Permission` type + `permissionsForRole`
- [x] Verify tests pass

### Task 2: Decorator + guard

**Files:**
- Create: `backend/src/common/authz/require-permissions.decorator.ts`
- Create: `backend/src/common/authz/permissions.guard.ts`
- Create: `backend/src/common/authz/permissions.guard.spec.ts`

- [x] Failing tests: allow when role has all required; 403 when missing
- [x] Implement decorator + guard
- [x] Verify pass

### Task 3: Wire controllers

**Files:**
- Modify: applications, contracts, enrollment, device-lifecycle controllers
- Modify: modules if guard must be provider (use `@Injectable` + APP or import in each module)

- [x] Attach `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions(...)`
- [x] Unit/e2e: staff unbind 403; owner path still works

### Task 4: Docs

- [x] Update PROJECT-STATUS / CHANGELOG / DECISION-LOG note Phase 3a partial RBAC
