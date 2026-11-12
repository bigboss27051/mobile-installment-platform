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
- REST: `/api/v1/products`, `/api/v1/inventory/*`, `/api/v1/customers`, `/api/v1/kyc/*` with JWT tenant scope
- E2E: cross-tenant inventory denial and stock flow (receive → transfer → reserve → release)
- E2E: cross-tenant customer/KYC denial and KYC submit/review flow

### Changed

- README updated to point at discovery docs
- `CURRENT-PHASE` and project status: R1b Customer + KYC complete; **R1c Application + Scorecard** is next
- R1b exit noted as backend-only; UI not claimed complete and production OCR remains BLOCKED pending credentials

### Decisions

- See `DECISION-LOG.md` D-001..D-023 (R1a slicing/inventory D-011..D-018; R1b customer/KYC D-019..D-023)
