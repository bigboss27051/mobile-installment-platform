# Database Design (Phase 0 Draft)

## Platform

- PostgreSQL  
- Prisma ORM  
- UUID primary keys  
- `created_at` / `updated_at` on mutable tables  
- Soft delete only where business requires retain-and-hide  
- Audit tables append-only  

## Financial Types

- Use `DECIMAL(18,2)` (or integer satang — finalize in Phase 1; Phase 0 default `DECIMAL(18,2)` + `currency CHAR(3)`)  
- Never floating point  

## Core Entity Groups

1. **Platform:** Tenant, SubscriptionPlan, TenantSubscription, Entitlement  
2. **Org:** Branch, User, Role, Permission, UserBranch  
3. **Catalog:** Product, ProductVariant, ImeiUnit, StockMovement  
4. **Customer:** Customer, KycCase, KycDocument, Consent  
5. **Origination:** InstallmentPlan, Application, ScorecardResult, ApprovalAction  
6. **Contract:** Contract, ContractVersion, PaymentScheduleItem  
7. **Money:** PaymentIntent, PaymentTransaction, LedgerEntry, Allocation  
8. **Collection:** CollectionCase, CollectionAction  
9. **Device:** Device, DeviceEnrollment, DevicePolicyState, DeviceCommand, DeviceEvent  
10. **Comms:** NotificationTemplate, NotificationDelivery  
11. **Audit:** AuditEvent  

## Critical Uniqueness

- `(tenant_id, imei)` unique for active inventory units (define status-aware unique index)  
- At most one **active** contract binding per IMEI  
- Webhook/`provider_event_id` unique for payment events  
- `Idempotency-Key` unique per tenant + route  

## Indexing Priorities

- All FK `tenant_id` composite indexes with frequent filters  
- Schedule due dates for overdue jobs  
- Device command status + device_id  
- Customer phone/national-id hash lookups (prefer hashed lookup columns)  

## Migration Strategy

- Prisma migrate in environments: local → dev → staging → prod  
- Expand/contract for breaking changes  
- Backup before prod migrate  
