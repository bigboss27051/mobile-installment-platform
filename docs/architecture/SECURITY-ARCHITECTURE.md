# Security Architecture (Phase 0 Draft)

## Principles

1. Deny by default  
2. Tenant isolation at every query boundary  
3. Least privilege RBAC  
4. Verify then trust (webhooks, device acks)  
5. Encrypt secrets at rest in secret stores; never in git  
6. Audit sensitive actions immutably  

## Authentication

- Password hashing with modern KDF (e.g., Argon2id or bcrypt with documented cost)  
- Access token (short-lived JWT) + refresh token rotation  
- OTP for customer login and sensitive merchant actions where required  
- Separate client audiences: admin-web, merchant-web, merchant-mobile, customer-mobile, device-agent  

## Authorization

- Permission checks on every mutating endpoint  
- Branch scope enforced for staff  
- Device restrictive commands require elevated permissions + reason  
- Super Admin actions audited and break-glass documented  

## Tenant Isolation

- `tenant_id` derived from auth context, not client body  
- Integration tests attempt cross-tenant read/write and expect denial  
- Optional DB row-level policies evaluated in later hardening phase  

## Data Protection

- KYC files in private object storage with short-lived signed URLs  
- Field-level masking for national ID in UI lists and logs  
- PDPA-aligned retention and deletion workflows (documented in security docs)  

## Payment Security

- Provider webhook signature validation mandatory  
- Idempotency keys for intents and webhook processing  
- No PAN/CVV storage  
- Restrictive device actions never triggered by unverified payment events  

## Device Security

- No hidden admin apps / persistence tricks  
- Transparent policies; recovery path required  
- Emergency communications preserved  
- Command expiry and replay protection  
- Enrollment tokens: CSPRNG, hashed at rest, TTL, single-consume/retry rules; staff QR view is authorized and audited  
- No Wi-Fi passwords, private keys, or MDM credentials in QR / client binaries  
- Bind requires consent record + matching tenant/contract/IMEI; shop codes are not admin credentials  
- AMAPI/MDM webhooks: signature + idempotency; never lock from unverified events  
- No stealth telemetry (no silent mic/camera/keylog); heartbeat is inventory/compliance/connectivity only  

## AppSec Baseline

OWASP Top 10 controls: input validation (Zod/class-validator), parameterized ORM queries, XSS-safe frontend defaults, CSRF strategy for cookie-based admin if used, rate limits on auth/OTP, dependency scanning in CI.
