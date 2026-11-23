# Production API host (ops checklist)

This document describes how to run the Nest API for a Thailand pilot. Completing the checklist is **not** a claim that live payments, Device Owner, or financing lock are approved.

## Prerequisites

- Managed PostgreSQL + Redis
- Public HTTPS hostname (TLS terminate at reverse proxy or load balancer)
- Secrets manager (never commit `.env` with live keys)
- Stripe account (test or live keys) if `PAYMENT_PROVIDER=stripe`
- Optional: SMS vendor before setting `OTP_CHANNEL=sms`

## Container

Build from [`backend/Dockerfile`](../../backend/Dockerfile):

```bash
cd backend && docker build -t mip-api:local .
```

Run with env from a secrets store. Apply Prisma migrations before traffic (`npx prisma migrate deploy`).

## Required env (matrix)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | Redis |
| `NATIONAL_ID_ENCRYPTION_KEY` | ≥32 chars |
| `JWT_ACCESS_SECRET` | ≥16 chars |
| `PAYMENT_WEBHOOK_SECRET` | ≥32 chars (sandbox path / shared) |
| `PAYMENT_PROVIDER` | `sandbox` (CI/dev) or `stripe` |
| `STRIPE_*` | Required when provider=`stripe` |
| `OTP_CHANNEL` | Default `sandbox`; `sms` requires `SMS_*` and still uses BlockedSmsAdapter until vendor wired |
| `DPC_*` | Public HTTPS download URL + SHA-256 checksum + enrollment endpoint |
| `MERCHANT_WEB_ORIGIN` | CORS origin for Merchant Web |

## Stripe webhook

Point Stripe Dashboard (or CLI) to:

`https://<api-host>/api/v1/webhooks/payments/stripe`

Raw body must be preserved for `Stripe-Signature` verification.

## Device agent / DPC

- `DPC_ENROLLMENT_ENDPOINT` must be `https://…/api/v1/devices/enroll/check-in`
- Lab cleartext / self-signed CA is not for production agents
- See [DPC-HOSTING-CHECKLIST.md](../device-management/DPC-HOSTING-CHECKLIST.md)

## PDPA / security

- No national IDs in logs
- No secrets in QR payloads
- Restrictive device actions require reason + authz
- Do not unlock or lock from unverified payment webhooks

## Explicit non-claims

- Running this Dockerfile ≠ commercial Device Owner / MDM approval
- Stripe PromptPay pilot ≠ Omise production certification
- `OTP_CHANNEL=sms` with BlockedSmsAdapter ≠ real SMS delivery
