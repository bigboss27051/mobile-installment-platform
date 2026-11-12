# Task 5 Report: Webhook Verify + Allocate + Ledger

## Status
Implemented and committed. Critical/Important code-quality findings for Task 5 have been fixed.

## Implemented
- Added sandbox payment webhook handling with HMAC verification before parsing or mutations.
- Added replay handling by `providerEventId`, including P2002 recovery by re-fetching the stored transaction.
- Added successful webhook processing in a Prisma transaction: intent row lock by sandbox provider ref, amount/status validation, schedule row locks with `FOR UPDATE`, FIFO schedule allocation, transaction creation, allocation rows, installment ledger debit (`CASH_CLEARING`) / credit (`INSTALLMENT_RECEIVABLE`) entries, and intent success update.
- Added failed-event persistence as `PaymentTransactionStatus.FAILED`, including raw event JSON, verified timestamp, intent failure marking, provider-event replay handling, and P2002 replay recovery without allocation or ledger writes.
- Added unauthenticated `POST /api/v1/webhooks/payments/sandbox` controller and registered it in `PaymentsModule`.
- Enabled Nest raw body capture via `NestFactory.create(AppModule, { rawBody: true })`.
- Hardened webhook controller raw-body handling so missing non-Buffer `req.rawBody` returns `400` instead of reconstructing JSON from `req.body`.

## Tests
- RED observed first: `npm test -- payments.service.spec.ts --runInBand` failed because `handleSandboxWebhook` did not exist.
- PASS: `npm test -- payments.service.spec.ts --runInBand` (`19` tests passed).
- PASS: `npm test -- payments --runInBand` (`33` tests passed).
- RED observed for code-quality fixes: `npm test -- payments.service.spec.ts webhooks.controller.spec.ts --runInBand` failed on missing raw-body rejection, missing `FOR UPDATE` locks, and unstored FAILED webhook summaries.
- PASS: `npm test -- payments.service.spec.ts webhooks.controller.spec.ts --runInBand` (`22` tests passed).
- PASS: `npm test -- payments --runInBand` (`36` tests passed).
- PASS: `npm run typecheck`.
- PASS: edited-file lints via `ReadLints`.
- PASS: `git diff --check`.

## Files
- `backend/src/payments/payments.service.ts`
- `backend/src/payments/webhooks.controller.ts`
- `backend/src/payments/payments.service.spec.ts`
- `backend/src/payments/webhooks.controller.spec.ts`
- `backend/src/payments/payments.module.ts`
- `backend/src/main.ts`

## SHA
Feature: `0c55d3b2f410684bee843920f84b1b74871db2a8`  
Ledger account fix: `357870b3223f9a6033659977477938c2688f5ce1`
Code-quality fix: final SHA reported after commit.

## Spec compliance (ledger accounts)
- Corrected payment ledger DEBIT from `INSTALLMENT_CASH` to `CASH_CLEARING` per spec; CREDIT remains `INSTALLMENT_RECEIVABLE`.

## Concerns
- The report was written after the feature commit so it can record the final feature SHA.
- Full concurrent E2E proof remains intentionally deferred to Task 6; Task 5 now has unit-level proof that intent and schedule locking queries use `FOR UPDATE`.
