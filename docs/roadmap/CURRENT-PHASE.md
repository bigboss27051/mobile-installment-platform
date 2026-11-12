# Current Phase: R1c — Application + Scorecard

**Previous:** R1b Customer + KYC complete on `develop` (`68bbbd6`)

## Scope

Backend application intake and scorecard rails as the next gated slice. Keep tenant isolation and financial correctness standards from R0/R1a/R1b.

## Status

**Next slice** — R1c spec and implementation plan should be drafted and approved before implementation.

## R1b (complete)

- Spec: `docs/superpowers/specs/2026-11-12-r1b-customer-kyc-design.md`
- Plan: `docs/superpowers/plans/2026-11-12-r1b-customer-kyc.md`
- Exit:
  - Customer create with encrypted national ID + tenant-unique phone
  - KYC case/document upload and submit flows via storage port
  - OCR sandbox/mock integration via OCR port
  - Staff KYC review with auditable review actions
  - Cross-tenant e2e denial for customer/KYC flows
  - Backend-only slice; no Merchant Web/Flutter UI claimed complete
  - Production OCR credentials remain BLOCKED

## Out of Scope (until later R1 slices)

R1d–R1f, production OCR credentials, full RBAC matrix, UI apps, device/payment live integrations
