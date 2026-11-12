# R1f Merchant Web + Customer Android Critical Paths Design

**Date:** 2026-11-12  
**Status:** Approved for implementation (user requested execute)  
**Parent:** R1 Installment Core  
**Depends on:** R0–R1e (staff JWT, ACTIVE contracts, sandbox PromptPay intents)

## Decisions

| ID | Decision |
|----|----------|
| D-036 | R1f delivers client **critical paths only**: Merchant Web (React) + Customer Android (Flutter); no Super Admin, Merchant Mobile, or DPC |
| D-037 | Customer auth is OTP sandbox bound to an existing tenant `Customer` (staff-created); JWT `typ=customer`; not a `User` row |
| D-038 | Public tenant lookup by `slug`; customers never send `tenantId` in bodies |
| D-039 | Customers may create PromptPay sandbox intents for **their** ACTIVE contracts; staff path unchanged |
| D-040 | Sandbox OTP is a fixed env code (default `123456`); live SMS is BLOCKED |

## Goal

Let merchant staff operate apply → approve → contract → pay from Merchant Web against real `/api/v1` APIs, and let a customer on Android view their contract/schedule and initiate a sandbox PromptPay QR — with tenant isolation and no trust of client-side “paid”.

## Non-Goals

- Live Omise / SMS OTP / refunds  
- Super Admin Web, Merchant Flutter, Android DPC, iOS MDM  
- Full MW-01..16 / CM-01..10 product catalog  
- Customer self-KYC capture, early settlement product, notifications  
- Full RBAC matrix / BullMQ  
- Device lock from payment  

## Architecture

```
Merchant Web (Vite React) --staff JWT--> Nest /api/v1
Customer Flutter          --customer JWT--> Nest /api/v1/me/*
Public                     GET /public/tenants/:slug
Sandbox webhook            unchanged from R1e
```

Staff controllers keep `JwtAuthGuard`. JWT payloads without `typ` remain staff. Payloads with `typ: "customer"` use a separate Passport strategy so customers cannot list tenant-wide resources.

## Domain additions

### Tenant.slug

- Unique public identifier generated at tenant create (`slugify(name)-xxxxxxxx`)  
- Exposed on `GET /tenants/me` for staff and `GET /public/tenants/:slug`  

### CustomerOtpChallenge

- `id`, `tenantId`, `phone`, `codeHash`, `expiresAt`, `consumedAt?`, `createdAt`  
- Rate limit: max 5 unconsumed/recent requests per `(tenantId, phone)` per 15 minutes → 429  
- Verify constant-time hash compare; consume on success  

### PaymentIntent actor

- `createdByUserId` nullable  
- `createdByCustomerId` nullable  
- Exactly one set at create time  

### JWT

Staff: `{ sub: userId, tenantId, role, typ?: 'staff' }`  
Customer: `{ sub: customerId, tenantId, typ: 'customer' }`  
Refresh rotation remains staff-only in R1f (customer access TTL uses `JWT_ACCESS_TTL`; optional customer refresh omitted — re-OTP).

## API surface (`/api/v1`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/public/tenants/:slug` | none | `{ id, name, slug }` if ACTIVE |
| POST | `/auth/customer/otp/request` | none | `{ tenantSlug, phone }` |
| POST | `/auth/customer/otp/verify` | none | `{ tenantSlug, phone, code }` → customer tokens |
| GET | `/me/contracts` | customer JWT | own contracts |
| GET | `/me/contracts/:id` | customer JWT | detail + schedule (`amountPaid`) + recent intents |
| POST | `/me/contracts/:id/payment-intents` | customer JWT + Idempotency-Key | create sandbox QR |
| GET | `/me/payment-intents/:id` | customer JWT | own intent + QR |

Existing staff catalog/inventory/customers/KYC/applications/contracts/payments APIs are unchanged except schedule details include `amountPaid`.

## Merchant Web screens (critical)

1. Login (email/password)  
2. Nav: Products, Inventory, Customers, Applications, Contracts  
3. Products: list + create product/variant  
4. Inventory: list IMEI + receive  
5. Customers: list + create (masked national ID)  
6. Applications: list, open, submit, approve/reject  
7. Contracts: list, create from approved application, activate, create payment intent, show QR payload JSON  

KYC review can be a thin panel on customer detail (create case / review) if timeboxed; otherwise staff can still use API. **Minimum:** customers list+create and applications decision so apply→approve→contract→pay is operable from the UI.

## Customer Android screens (critical)

1. Tenant slug + phone → request OTP  
2. Enter sandbox OTP → session  
3. Contract list  
4. Contract detail: schedule outstanding, Pay → QR text/payload, status refresh  
Never mark paid from local state; poll GET intent/contract.

## Security & privacy

- Customer JWT cannot access staff list endpoints  
- Customer intent/get scoped by `contract.customerId`  
- Mask national IDs in merchant lists (already)  
- No OTP in logs  
- CORS enabled for local Merchant Web origin  
- Rate-limit OTP request  

## Testing

- Unit: OTP request/verify (unknown customer, bad code, success, rate limit)  
- Unit/service: customer cannot create intent for another customer’s contract  
- E2E: customer JWT isolation across tenants; customer pay intent + staff cannot be impersonated by customer token on `/contracts`  
- Merchant Web: Vitest for API client auth header + 401 handling  
- Flutter: widget/unit test for OTP form validation + “never local paid” intent status mapping  

## Acceptance

1. Merchant Web login and critical ops hit real APIs  
2. Customer Android OTP sandbox login, contract view, create intent  
3. Customer cannot read another tenant/customer contract  
4. Staff payment APIs still work  
5. No live Omise / SMS / MDM claimed  

## Follow-on

- SMS OTP adapter, customer refresh tokens  
- Merchant Mobile Flutter  
- Super Admin web  
- Remaining MW/CM features (reports, device, early settlement)  
