# Data Dictionary (Initial)

| Entity | Key fields | Notes |
|--------|------------|-------|
| Tenant | id, name, status, verified_at | ACTIVE/SUSPENDED/PENDING |
| Branch | id, tenant_id, code, name, status | Unique (tenant_id, code) |
| User | id, tenant_id nullable for platform, email, password_hash, status | Platform users tenant_id null |
| Role / Permission | codes | RBAC bundles |
| Customer | id, tenant_id, full_name, phone, national_id_encrypted/hash | Mask in UI/logs |
| KycCase | id, customer_id, status | DRAFT/SUBMITTED/APPROVED/REJECTED/RESUBMIT |
| Product / Variant | sku, brand, model, attrs | Variant holds storage/color |
| ImeiUnit | imei, variant_id, branch_id, status | AVAILABLE/RESERVED/SOLD/RETURNED |
| InstallmentPlan | interest_method, rate, term_options, fees_json | FLAT/REDUCING |
| Application | customer_id, imei_id, plan_id, principal, down_payment, status | |
| ScorecardResult | score, band, reasons_json | Advisory |
| ApprovalAction | actor_id, decision, reason | Immutable |
| Contract | status, activated_at, closed_at | ACTIVE/CLOSED/CANCELLED |
| ContractVersion | version, terms_snapshot, schedule_hash | Immutable snapshot |
| PaymentScheduleItem | seq, due_date, principal_due, interest_due, fees_due, status | |
| PaymentIntent | amount, status, idempotency_key | |
| PaymentTransaction | provider_ref, amount, status | |
| LedgerEntry | direction, amount, account_code, domain | INSTALLMENT vs SAAS |
| Allocation | transaction_id, schedule_item_id, amount | |
| EnforcementPolicy | preset, levels_json | Merchant configurable |
| Device | platform, external_id, status | ANDROID/IOS |
| DeviceCommand | type, level, reason, status, expires_at, result | Async |
| AuditEvent | actor, action, entity, payload_redacted | Append-only |
