# API Standards

## General

- Style: REST  
- Version prefix: `/api/v1`  
- Format: JSON (`application/json`)  
- Auth: `Authorization: Bearer <access_token>`  
- Time: ISO-8601 UTC  
- Money: string decimal or integer minor units — **choose integer satang in implementation docs; Phase 0 assumption: decimal string with 2 places + currency code `THB`**  
- IDs: UUID v4 strings  

## Response Envelope

Success list:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0 }
}
```

Success item:

```json
{ "data": { } }
```

Error:

```json
{
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "You cannot access this resource.",
    "details": [],
    "requestId": "uuid"
  }
}
```

Never return raw stack traces to clients.

## Pagination / Filter / Sort

- `page`, `pageSize` (max enforced)  
- `sort=field:asc|desc`  
- Filters as explicit query params per resource  

## Idempotency

Required on: payment intents, webhook processing, device command create, enrollment session create, device activate, bind/unbind, refunds.  
Header: `Idempotency-Key: <string>`  

## Status Codes

| Code | Use |
|------|-----|
| 200/201 | Success |
| 400 | Validation |
| 401 | Unauthenticated |
| 403 | Unauthorized / tenant deny |
| 404 | Not found (no cross-tenant leakage) |
| 409 | Conflict (IMEI bound, duplicate) |
| 422 | Semantic business rule failure |
| 429 | Rate limit |
| 502/503 | Provider/downstream |

## Resource Naming (initial)

```text
/api/v1/auth/*
/api/v1/tenants/*
/api/v1/branches/*
/api/v1/users/*
/api/v1/customers/*
/api/v1/kyc/*
/api/v1/products/*
/api/v1/inventory/*
/api/v1/imeis/*
/api/v1/applications/*
/api/v1/contracts/*
/api/v1/payments/*
/api/v1/devices/*
/api/v1/devices/enrollment-sessions/*
/api/v1/device-commands/*
/api/v1/webhooks/device-management/*
/api/v1/subscriptions/*
/api/v1/reports/*
/api/v1/webhooks/payments/*
```

## OpenAPI

- NestJS Swagger decorators required on public endpoints  
- Contracts published to `packages/api-contracts` when codegen begins  

## Tenant Rule

Server derives tenant from auth context. Bodies may include branchId if authorized; they must not select arbitrary tenantId.

Device enrollment endpoints: [DEVICE-ENROLLMENT-API.md](./DEVICE-ENROLLMENT-API.md).
