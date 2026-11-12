# Current Phase: R1b — Customer + KYC

**Previous:** R1a Inventory + Product + IMEI complete on `develop` (`4ee21d0`)

## Scope

Backend customer domain and KYC capture/validation. No Merchant Web or Flutter in the early R1 slices (see D-016).

## Status

**Next slice** — R1b spec and implementation plan not yet written. Start with product/spec review per Phase 0 artifacts.

## R1a (complete)

- Spec: `docs/superpowers/specs/2026-11-12-r1a-inventory-imei-design.md`
- Plan: `docs/superpowers/plans/2026-11-12-r1a-inventory-imei.md`
- Exit: Prisma inventory models; catalog + inventory REST; tenant-scoped IMEI flows; e2e isolation; no Merchant Web in slice
- Exception: authenticated tenant members are accepted without a full RBAC matrix in R1a; full matrix remains deferred to Phase 3 continuation (see D-018)

## Out of Scope (until later R1 slices)

R1c–R1f, device management, live payments, full RBAC matrix
