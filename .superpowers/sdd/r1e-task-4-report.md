# R1e Task 4 — Payment intent create + get

**Status:** DONE — hardened after code-quality review

## Implemented

- `PaymentsModule` wired into `AppModule`, importing `PaymentsGatewayModule` and `PrismaModule`
- `POST /contracts/:id/payment-intents`
  - JWT guarded, tenant-scoped, `{ data }` response
  - Requires `Idempotency-Key` header at controller level (`400` if missing/blank)
  - OWNER/STAFF only, matching contract mutation role policy
  - ACTIVE contract required (`409` for wrong status, `404` for missing/cross-tenant)
  - Idempotency reuse by unique `(tenantId, idempotencyKey)` returns existing intent only when `contractId` and 2dp amount match; mismatched reuse returns `409`
  - Outstanding balance computed from non-PAID schedule items using `Prisma.Decimal`
  - Amount parsed via `parseThbMoneyString`; invalid/zero/overpay returns `422`
  - Creates the `PaymentIntent` row with `CREATED` status before calling `gateway.createPromptPayIntent`, then updates provider fields and status to `AWAITING_PROVIDER`
  - Handles idempotency race by catching Prisma `P2002`, re-fetching, checking payload match, and returning the existing winner without calling the gateway
  - Marks the created intent `FAILED` if gateway creation throws after the row is inserted
- `GET /payment-intents/:id`
  - JWT guarded, tenant-scoped, `{ data }` response
- DTO for string decimal amount

## Tested

```bash
npm test -- payments.service.spec.ts
```

Result: **10 passed** (blank idempotency key documented as service-level guard, overpay, idempotent reuse, mismatched reuse `409`, P2002 race fallback, create-then-gateway-then-update happy path, gateway failure marks `FAILED`, non-ACTIVE conflict, missing/cross-tenant contract 404, cross-tenant get 404)

```bash
npm run typecheck
```

Result: **PASS**

```bash
npm test
```

Result: **21 test suites passed, 176 tests passed**

IDE lint diagnostics for touched files: **none**

## Files

| Path | Action |
|------|--------|
| `backend/src/payments/dto/create-payment-intent.dto.ts` | Created |
| `backend/src/payments/payments.controller.ts` | Created |
| `backend/src/payments/payments.module.ts` | Created |
| `backend/src/payments/payments.service.ts` | Created |
| `backend/src/payments/payments.service.spec.ts` | Created |
| `backend/src/app.module.ts` | Modified |

## Self-review

- Route paths match existing controller style and do not repeat global `api/v1`
- Tenant scoping is applied to contract, schedule item, idempotency lookup, and get-by-id queries
- Money math avoids floats and uses `Prisma.Decimal`
- Webhook handling intentionally not implemented; deferred to Task 5
- Controller also rejects missing `Idempotency-Key`; the required unit coverage documents the service-level blank-key guard in `payments.service.spec.ts`

## Issues / concerns

- The prior provider-before-insert race has been fixed. Only the request that wins the unique `(tenantId, idempotencyKey)` insert calls the gateway.
- The report file was written after the implementation commit so it can include the SHA below.

## Commit SHA

See completion summary — `fix: harden payment intent idempotency create path`
