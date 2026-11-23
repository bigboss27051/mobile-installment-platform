# Security Baseline

See also [../architecture/SECURITY-ARCHITECTURE.md](../architecture/SECURITY-ARCHITECTURE.md).

## Pilot baseline controls

1. Authn: strong password hashing, JWT access + rotating refresh, OTP for customers  
2. Authz: RBAC + branch scope (`UserBranchAssignment` for MERCHANT_STAFF; OWNER unrestricted in tenant — D-071)  
3. Tenant isolation tests in CI  
4. Payment webhook signatures + idempotency  
5. PII redaction in logs  
6. Private object storage for KYC artifacts  
7. Device command authorization + reason + audit  
7b. Enrollment session TTL, hashed tokens, no secrets in QR, audited bind/unenroll  
8. Dependency scanning planned in CI (Phase 2+)  
9. Secrets only via env/secret manager  
10. Auth/OTP rate limits + `/health` liveness + `/health/ready` Postgres probe (D-071)  

See also [OPS-HARDENING-CHECKLIST.md](./OPS-HARDENING-CHECKLIST.md) and [PDPA-OFFBOARDING-CHECKLIST.md](./PDPA-OFFBOARDING-CHECKLIST.md).

## Legal / compliance follow-ups (not engineering-complete)

- PDPA DPIA for KYC + device monitoring  
- Customer contract disclosures for device enforcement  
- Merchant agreement for self-funded credit operations  
