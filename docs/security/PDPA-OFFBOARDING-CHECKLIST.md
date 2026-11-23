# PDPA / Merchant Offboarding Checklist (draft)

**Status:** engineering draft aligned with D-051 sequencing. **Not** counsel-approved. Do not treat as legal clearance for Thailand PDPA.

## Retention & access paths (pilot)

- [ ] Document retention windows for KYC artifacts, national-ID ciphertext, device location history, and audit logs
- [ ] Confirm national IDs are encrypted at rest + masked in UI lists/logs
- [ ] Confirm staff access to PII is tenant-scoped and audited where implemented
- [ ] Soft location purge rules still apply on unlock / unenroll / TTL (D-061)
- [ ] Customer OTP challenges expire and are not logged with full codes

## Merchant offboarding (tenant leave)

When a merchant tenant leaves the pilot:

1. [ ] Disable staff logins (users inactive / credentials rotated)
2. [ ] Revoke refresh tokens and invalidate active JWTs (restart or denylist if used)
3. [ ] Unenroll / release Device Owner bindings per recovery SOP (`UNENROLL` / `RELEASE` / `CONTRACT_CLOSE` as applicable)
4. [ ] Remove or rotate LINE OA credentials stored for the tenant
5. [ ] Cancel Stripe webhook endpoints / rotate `STRIPE_*` if tenant-specific
6. [ ] Export or delete KYC object-storage prefixes per retention policy
7. [ ] Drop or anonymize tenant rows per agreed retention (DB + backups cadence)
8. [ ] Confirm branch assignments and inventory no longer operable for that `tenantId`

## Cross-checks

- Align disclosure UX copy with counsel when D-051 moves past draft
- Keep emergency calling available until devices are unenrolled
- Never store Google account passwords for FRP (D-060)

## Related

- [OPS-HARDENING-CHECKLIST.md](./OPS-HARDENING-CHECKLIST.md)
- [LEGAL-COUNSEL-PACKET.md](../device-management/LEGAL-COUNSEL-PACKET.md)
- Decision **D-071**
