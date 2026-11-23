# Ops Hardening Checklist (pilot)

Use before any public/staging cutover. Completing this checklist is **not** a claim that production Device Owner, live SMS, or counsel-approved PDPA are done.

## Secrets & config

- [ ] No secrets in git; only `.env.example` templates
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` ≥ 16 chars, unique per env
- [ ] `NATIONAL_ID_ENCRYPTION_KEY` ≥ 32 chars; rotate procedure documented
- [ ] `PAYMENT_WEBHOOK_SECRET` set; Stripe path also needs `STRIPE_WEBHOOK_SECRET` when `PAYMENT_PROVIDER=stripe`
- [ ] `DPC_*` (component, HTTPS download URL, package checksum, enrollment endpoint) valid for shop APK
- [ ] SMS vendor keys only when `OTP_CHANNEL=sms` (default remains sandbox / blocked adapter)

## Transport

- [ ] TLS terminated at load balancer or Nest (`TLS_CERT_PATH` / `TLS_KEY_PATH`) for any public API
- [ ] Merchant Web origin allowlist (`MERCHANT_WEB_ORIGIN`) matches deployed UI
- [ ] Enrollment / webhook URLs are HTTPS only in non-lab envs

## Auth / abuse controls

- [ ] Global Nest throttler enabled (default ~120/min)
- [ ] Stricter limits on `POST /api/v1/auth/login` and customer OTP request/verify
- [ ] Customer OTP window count in `customer-auth.service` still enforced (defense-in-depth)
- [ ] Staff passwords hashed with strong KDF; refresh rotation verified in target env

## Payments

- [ ] Webhook signature verification mandatory (`sandbox` HMAC or Stripe `whsec_`)
- [ ] Idempotency keys exercised for create-intent / webhook retries
- [ ] No PAN/CVV stored; PromptPay QR only

## Device / DPC

- [ ] Restrictive device commands require authz + reason; never from unverified payments
- [ ] DPC APK hosting checksum matches `DPC_PACKAGE_CHECKSUM`
- [ ] Emergency calling remains available at all device levels (lab SOP)

## Health & backups

- [ ] Probe `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (Postgres)
- [ ] Postgres backups + restore drill scheduled (see [PRODUCTION-DEPLOY.md](../operations/PRODUCTION-DEPLOY.md))
- [ ] Redis availability monitored (not a hard-fail on `/health/ready` in this slice)

## Related

- [SECURITY-BASELINE.md](./SECURITY-BASELINE.md)
- [PDPA-OFFBOARDING-CHECKLIST.md](./PDPA-OFFBOARDING-CHECKLIST.md)
- Decision **D-071** (branch scope + throttle/health pack)
