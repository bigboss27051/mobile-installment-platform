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
- REST: `/api/v1/products`, `/api/v1/inventory/*` with JWT tenant scope
- E2E: cross-tenant inventory denial and stock flow (receive → transfer → reserve → release)

### Changed

- README updated to point at discovery docs
- `CURRENT-PHASE` and project status: R1a complete; **R1b Customer + KYC** is next

### Decisions

- See `DECISION-LOG.md` D-001..D-017 (R1a slicing and inventory model: D-011..D-017)
