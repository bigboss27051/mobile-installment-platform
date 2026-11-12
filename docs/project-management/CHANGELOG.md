# Changelog

## Unreleased

### Added

- Phase 0 product discovery documentation set
- Decision log, risk register, backlog, release plan
- Architecture and database drafts
- API standards
- Cursor rules/agents stubs (when present)
- R1a inventory design spec and implementation plan (`docs/superpowers/specs/`, `docs/superpowers/plans/`)
- Backend catalog module: product and variant create with `Decimal` price (THB)
- Backend inventory module: IMEI receive, transfer, reserve, release; movement audit
- R1b customer module: create/read customer profiles with encrypted national ID and tenant-unique phone
- R1b KYC module: case creation, document upload via storage port, submit flow, and OCR sandbox adapter
- R1b staff review flow: approve/reject/pending transitions with auditable review actions
- R1c installment plans: per-tenant seed data and read-only listing for application intake
- R1c application module: DRAFT create/list/get, submit gating on APPROVED KYC, and decision/cancel actions
- R1c scorecard rails: pure-function advisory scoring (`r1c-v1`) persisted on submit
- R1d contract schema rails: draft contract entities, status lifecycle, and open-application uniqueness guard
- R1d schedule rails: pure-function `r1d-v1` flat/reducing installment schedule generation
- R1d contract APIs: create/list/get DRAFT from APPROVED applications, plus activate/cancel transitions
- REST: `/api/v1/products`, `/api/v1/inventory/*`, `/api/v1/customers`, `/api/v1/kyc/*` with JWT tenant scope
- REST: `/api/v1/installment-plans`, `/api/v1/applications` with JWT tenant scope
- REST: `/api/v1/contracts` with JWT tenant scope
- E2E: cross-tenant inventory denial and stock flow (receive → transfer → reserve → release)
- E2E: cross-tenant customer/KYC denial and KYC submit/review flow
- E2E: cross-tenant application denial and submit/decision IMEI state transitions
- E2E: cross-tenant contract denial plus activate/cancel IMEI state invariants

### Changed

- README updated to point at discovery docs
- `CURRENT-PHASE` and project status: R1d Contract + Schedule complete; **R1e Payment verify + allocate** is next
- R1d exit criteria recorded as met; backend-only slice with no e-sign, payment posting, or UI completion claim

### Decisions

- See `DECISION-LOG.md` D-001..D-029 (R1a slicing/inventory D-011..D-018; R1b customer/KYC D-019..D-023; R1c app/scorecard D-024..D-027; R1d contract/schedule D-028..D-029)
