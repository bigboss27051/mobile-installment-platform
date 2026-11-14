# RBAC Phase 3a — Design

**Date:** 2026-11-14  
**Status:** Approved for implementation  
**Slice:** Early Phase 3 authz foundation (not full USER-ROLES.md matrix)

## Goal

Introduce explicit permission codes and a Nest guard so critical mutating routes fail closed when the staff role lacks the grant. Keep existing `MERCHANT_OWNER` / `MERCHANT_STAFF` / `SUPER_ADMIN` roles as permission bundles.

## In scope

| Permission | Routes |
|------------|--------|
| `applications.decide` | `POST /applications/:id/decision` |
| `contracts.activate` | `POST /contracts/:id/activate` |
| `devices.enroll` | enrollment session create / QR / cancel |
| `devices.activate` | `POST /devices/activate` |
| `devices.bind` | `POST /devices/:id/bind-contract` |
| `devices.unbind` | `POST /devices/:id/unbind-contract` |

### Role bundles

- **MERCHANT_OWNER:** all six permissions  
- **MERCHANT_STAFF:** all except `devices.unbind`  
- **SUPER_ADMIN:** same as owner for these codes when acting with a tenant context (no cross-tenant bypass)

Service-level unbind elevation remains; guard is the HTTP gate.

## Out of scope

- New roles (Manager, Credit, Sales, …)  
- `UserBranch` / branch-scoped queries  
- AMAPI / device lock commands  
- Rewriting every read endpoint  

## Design

- `permissions.ts` — permission string union + `permissionsForRole(role)`  
- `@RequirePermissions(...codes)` metadata decorator  
- `PermissionsGuard` — reads JWT `role`, checks required codes; 403 `FORBIDDEN` if missing  
- Controllers keep `@UseGuards(JwtAuthGuard, PermissionsGuard)` with method-level `@RequirePermissions`  
- Unit tests for map + guard; e2e: owner unbind OK, staff unbind 403  

## Acceptance

- Staff JWT cannot unbind (403)  
- Owner can decide / activate contract / enroll / activate+bind  
- Missing role → deny  
- Tenant isolation e2e still pass  
