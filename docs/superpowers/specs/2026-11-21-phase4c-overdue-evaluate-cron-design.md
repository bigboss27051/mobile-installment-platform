# Phase 4c Overdue Evaluate Cron (Hardened Lab) Design

**Date:** 2026-11-21  
**Status:** Implemented (lab software)  
**Depends on:** Phase 4b `OverdueLockOrchestrator`  
**Decision:** D-064 (lab)

## Goal

Env-gated Nest cron that calls `evaluateTenant` for every tenant, with **dedicated system actor**, **Postgres advisory single-flight**, and **explicit enable/disable + invalid-cron failure** so silent misconfig does not happen.

## Fixes vs weak draft

| Weakness | Fix |
|----------|-----|
| First owner may be missing | Upsert per-tenant system user `system-overdue+{tenantId}@mip.internal` (`MERCHANT_OWNER`) |
| Multi-instance double run | `pg_try_advisory_lock(872314001)` around full tick; skip if not acquired |
| Silent when cron unset/wrong | Unset → log **disabled** at boot; invalid expr → **throw on boot**; each tick logs start/end + per-tenant summary counts |

## Non-goals

- REMINDER/RESTRICT ladder, merchant thresholds, human approval  
- External alerting (PagerDuty etc.) — structured logs only this slice  
- Redis lock (use Postgres; already required)

## Env

- `OVERDUE_EVALUATE_CRON` — optional cron string (e.g. `0 * * * *`). Empty/unset = disabled.  
- Document in `.env.example`.

## Flow

```text
OnModuleInit → register CronJob if expr set (else log disabled)
tick:
  try_advisory_lock → if false: log SKIP_LOCK; return
  for each tenant:
    ensureSystemActor → evaluateTenant(ctx, "cron overdue-evaluate", "cron:{tenantId}:{ymd}:{HH}")
  finally advisory_unlock
```

## Acceptance

- Unit: disabled when env empty; system actor upsert; lock skip path; tick calls orchestrator  
- Boot log proves enabled/disabled  
- Docs: CURRENT-PHASE, backlog R2-P4-003, D-064  
