# Tenant Isolation

## Rules

1. Every business table that stores merchant/customer operational data includes `tenant_id UUID NOT NULL`.  
2. Application services receive `TenantContext` from auth middleware.  
3. Client-supplied `tenant_id` is ignored for authorization decisions.  
4. Queries always filter by `tenant_id` (enforced in repositories).  
5. Cross-tenant foreign keys are forbidden.  
6. Super Admin global queries use explicit elevated context and are audited.  

## Test Cases (mandatory)

| ID | Scenario | Expected |
|----|----------|----------|
| TI-01 | Tenant A token reads Tenant B customer | 403/404 |
| TI-02 | Tenant A updates Tenant B contract | 403/404 |
| TI-03 | Webhook without valid tenant mapping | reject |
| TI-04 | Device command for other tenant device | 403 |
| TI-05 | Report export limited to tenant | no foreign rows |

## Defense in Depth (later hardening)

- Prisma middleware / extension asserting tenant predicate  
- Optional PostgreSQL RLS policies keyed by session variable  
- Automated CI suite dedicated to isolation  

## Exceptions

- Platform catalog tables (subscription plans definitions) may be global read-only  
- Shared infrastructure tables (migration history) are non-tenant  
