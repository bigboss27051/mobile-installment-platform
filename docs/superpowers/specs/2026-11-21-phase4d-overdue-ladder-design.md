# Phase 4d Overdue Ladder (Lab) Design

**Date:** 2026-11-21  
**Status:** Implemented (lab software)  
**Depends on:** Phase 4b evaluate path, 4c cron  
**Decision:** D-065

## Goal

Replace jump-to-LOCK with a fixed lab ladder from oldest unpaid past-due schedule day count (Asia/Bangkok):

| Overdue days | Target desired | Platform action |
|--------------|----------------|-----------------|
| 0 (not overdue) | (no escalate) | skip |
| ≥ 1 | `REMINDER` | policy + audit only |
| ≥ 3 | `RESTRICT` | `START_PACKAGE_SUSPEND` |
| ≥ 7 | `LOCK` | `START_LOCK_TASK` |

Escalate-only; unlock/step-down remains Phase 4a / staff STOP.

## Non-goals

Merchant threshold UI, human approval, `SHOW_REMINDER` DPC command, external alerting, iOS.

## Rules

- `overdueDays` = floor days between oldest unpaid `dueDate` (status ≠ PAID) that is `< today Bangkok` and Bangkok today; if none → 0.  
- If current desired rank ≥ target rank → skip `ALREADY_AT_OR_ABOVE`.  
- Idempotency day marker: `overdue-ladder:{ymd}:{REMINDER|RESTRICT|LOCK}` in reason/audit.  
- Staff evaluate + cron reuse same orchestrator.

## Acceptance

Unit tests for day→target, escalate-only, REMINDER without enqueue, RESTRICT/LOCK enqueue; docs D-065 / R2-P4-004 / CURRENT-PHASE.
