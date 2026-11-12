# R1e Task 4 — Payment intent create + get

**Status:** DONE — concurrency-safe `markIntentFailed` + resume peer-win handling

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
  - Marks the created intent `FAILED` via guarded `updateMany` on `CREATED|FAILED` only if gateway creation throws after the row is inserted
  - Resumes existing idempotent intents stuck in `CREATED` or `FAILED` by calling the gateway with the original intent id, then applying provider fields with a guarded `updateMany` on `CREATED|FAILED`
  - On resume gateway failure, re-fetches intent; if a concurrent peer already set `AWAITING_PROVIDER` with `providerRef`, returns that success instead of clobbering to `FAILED`
  - Existing `AWAITING_PROVIDER`, `SUCCEEDED`, `CANCELLED`, and `EXPIRED` intents remain idempotent returns without another gateway call
- `GET /payment-intents/:id`
  - JWT guarded, tenant-scoped, `{ data }` response
- DTO for string decimal amount

## Tested

```bash
npm test -- payments.service.spec.ts
```

Result: **15 passed** (prior 13 cases plus resume gateway failure with peer `AWAITING_PROVIDER` win, and resume failure rethrow when still `FAILED`)

```bash
npm run typecheck
```

Result: **PASS**

```bash
npm test
```

Result: **21 test suites passed, 181 tests passed**

IDE lint diagnostics for touched files: **none**

## Files

| Path | Action |
|------|--------|
| `backend/src/payments/dto/create-payment-intent.dto.ts` | Created |
| `backend/src/payments/payments.controller.ts` | Created |
| `backend/src/payments/payments.module.ts` | Created |
| `backend/src/payments/payments.service.ts` | Created; updated to resume `CREATED`/`FAILED` idempotency replays |
| `backend/src/payments/payments.service.spec.ts` | Created; updated with resume/no-op idempotency coverage |
| `backend/src/app.module.ts` | Modified |

## Self-review

- Route paths match existing controller style and do not repeat global `api/v1`
- Tenant scoping is applied to contract, schedule item, idempotency lookup, and get-by-id queries
- Money math avoids floats and uses `Prisma.Decimal`
- Webhook handling intentionally not implemented; deferred to Task 5
- Controller also rejects missing `Idempotency-Key`; the required unit coverage documents the service-level blank-key guard in `payments.service.spec.ts`

## Issues / concerns

- Concurrent resume: unconditional `markIntentFailed` could overwrite a peer’s `AWAITING_PROVIDER`; fixed with status-guarded `updateMany` and peer-win return path after resume gateway errors.

## Commit SHA

`fix: prevent failed intent update from clobbering AWAITING_PROVIDER` (latest on `develop`)
