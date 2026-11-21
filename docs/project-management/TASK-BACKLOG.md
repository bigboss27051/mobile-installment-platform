# Task Backlog

Statuses: `BACKLOG` | `READY` | `IN_PROGRESS` | `BLOCKED` | `IN_REVIEW` | `TESTING` | `DONE`

## Phase 0 — Product Discovery

| Task ID | Description | Priority | Owner | Dependencies | Acceptance | Status | Test |
|---------|-------------|----------|-------|--------------|------------|--------|------|
| P0-001 | Inspect repository | P0 | Architect | — | Greenfield confirmed | DONE | Manual |
| P0-002 | Lock critical business decisions | P0 | Architect | P0-001 | Decision log filled | DONE | Review |
| P0-003 | Write product docs set | P0 | Architect | P0-002 | Files under docs/product | DONE | Review |
| P0-004 | Write architecture drafts | P0 | Architect | P0-002 | docs/architecture + api standards | DONE | Review |
| P0-005 | Write domain/ERD drafts | P0 | Architect | P0-002 | docs/database | DONE | Review |
| P0-006 | Risk + backlog + release plan | P0 | Architect | P0-002 | PM docs exist | DONE | Review |
| P0-007 | Cursor rules/agents stubs | P0 | Architect | P0-003 | .cursor/* present | DONE | Review |
| P0-008 | Phase 0 review report | P0 | Architect | P0-003..007 | Report delivered | DONE | Review |
| P0-009 | Human approve Phase 0 → Phase 1 | P0 | Stakeholder | P0-008 | Explicit approval | DONE | — |

## Phase 1+ (preview)

| Task ID | Description | Priority | Owner | Status |
|---------|-------------|----------|-------|--------|
| P1-001 | Finalize architecture for foundation | P0 | Architect | BACKLOG |
| P2-001 | Scaffold monorepo + NestJS + Prisma + Compose | P0 | Backend | BACKLOG |
| P3-001 | Auth + tenant isolation tests | P0 | Backend/QA | BACKLOG |
| P4-001 | Inventory/IMEI module | P1 | Backend | BACKLOG |
| P5-001 | Customer/KYC module | P1 | Backend | BACKLOG |
| P6-001 | Installment/contract math + tests | P0 | Backend/QA | BACKLOG |
| P7-001 | Payment adapters + webhook idempotency | P0 | Backend | BACKLOG |
| P8-001 | Merchant/Super Admin web critical pages | P1 | Frontend | BACKLOG |
| P9-001 | Flutter merchant/customer apps | P1 | Flutter | BACKLOG |
| P10-001 | Custom DPC QR Device Owner lab (D-057) | P0 | Android | BACKLOG |
| P11-001 | iOS MDM vendor adapter skeleton | P1 | Backend | BACKLOG |
| DM0-001 | Custom DPC QR + Zero-touch lab on 3+ GMS SKUs | P0 | Architect/Android | BLOCKED (no hardware; ask before wipe) |
| DM0-002 | Model B ABM + Configurator iPhone + vendor MDM lab | P0 | Architect | BLOCKED (no ABM) |
| DM0-003 | Compatibility matrix + AMAPI policy gap note | P0 | QA/Architect | DONE (desk map; SKUs NOT RUN) |
| DM0-004 | Architecture ADRs D-042–D-053 | P0 | Architect | DONE |
| DM0-005 | Desk feasibility report + AMAPI ToS (D-054) | P0 | Architect | DONE |
| DM0-006 | Submit Google AMAPI permissible-usage inquiry | P2 | Stakeholder | OPTIONAL (not the D-057 lock path) |
| DM1-001 | Enrollment sessions API + token lifecycle (after DM0) | P0 | Backend | DONE (stub; no AMAPI) |
| DM2-001 | Activation + contract bind + isolation tests | P0 | Backend | DONE (stub; no AMAPI/Apple HTTP) |
| DM2-002 | Merchant Web enroll wizard session + stub QR | P1 | Frontend | DONE (stub QR; not production DO) |
| R2-P1-001 | Shared enrollment foundation: `QR_GENERATED` + `NOT_STARTED`, policy presentation fields, dashboard GET | P0 | Backend/Web | DONE |
| R2-P2-001 | Custom DPC QR extras (replace Cloud DPC stub) + Device Owner check-in on authorized lab phone | P0 | Android/Backend | DONE (Pad 6 DO + check-in; ask before wipe) |
| R2-P3-001 | Phase 3a Lock Task command loop: enqueue/poll/ack + DPC Lock Task Mode (lab) | P0 | Android/Backend | IN_PROGRESS (Pad 6 START_LOCK_TASK ack LOCKED; not production) |
| R2-P2-002 | FRP after wipe: SOP + Merchant Web checklist + REENROLL after FRP cleared (no remote bypass) | P0 | Docs/Product/Backend | IN_PROGRESS (SOP+checklist+REENROLL API done; lab wipe/re-prove needs wipe approval) |
| P3-002 | Phase 3a RBAC permission codes + guard on critical mutates | P0 | Backend | DONE (OWNER/STAFF bundles; no branch scope) |
