# Module Dependencies

Allowed dependency direction (left depends on right only via stable interfaces):

```text
Notification, Reporting, Collection
        ↓
Device (enroll/bind) ← Contract ← Installment ← Customer/KYC
   ↓         ↓           ↓
Payment/Ledger ← Inventory/IMEI ← Product
        ↓
Tenant / Branch / User / RBAC / Auth
        ↓
Audit (write-only sink from all)
```

## Rules

1. Controllers depend on application services, not Prisma directly.  
2. Inventory must not import Payment.  
3. Device must not verify **payment** webhooks; it consumes verified domain events. Payment-to-Unlock lives in Device and only sees those events. Android DPM code must not live in the Apple adapter (or vice versa).  
4. Subscription/SaaS billing must not share ledger tables with installment payments.  
5. Circular imports between domain modules are forbidden; extract shared kernel types to `packages/shared-types` when needed.  

## Shared Kernel (minimal)

- TenantId, UserId, Money (decimal), DateTime UTC  
- Result/Error codes  
- Pagination types  
- AuditActor metadata  

Keep shared kernel small to avoid a distributed monolith of types.
