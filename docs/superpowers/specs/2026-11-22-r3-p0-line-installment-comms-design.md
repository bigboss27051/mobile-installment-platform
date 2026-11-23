# R3-P0 LINE Installment Comms (Design)

**Date:** 2026-11-22  
**Status:** Accepted for implementation (Approach B / thin R3 parallel to R2)  
**Decision:** D-066

## Problem

Merchants need LINE Official Account as a consent-gated channel to link customers, answer installment status questions, and send payment reminders/confirmations. The full “LINE chat CRM” prompt is too large for one change and invents a Unified Inbox that does not exist.

## Goals (in scope)

1. Per-**tenant** LINE OA configuration (sandbox first; production BLOCKED without credentials).
2. Webhook receive with signature verification + idempotency.
3. Customer ↔ LINE user linking (server-side only; hashed invite tokens).
4. Read-only installment replies via LINE (outstanding, next due, payment history summary) using existing contract/payment domain — **no** schedule math in the LINE module.
5. Templated outbound: payment reminder (manual), payment confirmation (hook after verified payment).
6. Thin Merchant Web: LINE settings + customer link status / invite.

## Non-goals (deferred)

- Unified Inbox / omnichannel conversation UI product.
- Full Rich Menu CMS (fixed sandbox menu mapping only if needed).
- LLM/NLU for balances or payment decisions.
- Payment processing or marking paid from LINE.
- Live LINE Messaging API production claims without provider + consent templates.
- Wiring overdue ladder external alerting (still deferred from Phase 4d) — payment confirmation + manual reminder only in P0.
- BullMQ (use sync/in-process send for sandbox; queue later).

## Architecture

```
LINE Webhook → LineWebhookController → verify signature (port) → idempotent event store
  → resolve LineCustomerLink → LineBotHandler (state: select contract / reply)
  → LineInstallmentQueryService → Portal/Contract/Schedule reads (tenant + customer scoped)

Staff → LineConfigService / LineLinkingService (JWT + permissions)
Payment SUCCEEDED → NotificationService → NotificationChannelPort (LINE sandbox) → Delivery log
```

- New Nest module: `backend/src/line/` (comms + LINE-specific) plus `backend/src/common/notifications/` for `NotificationChannelPort`.
- Tenant isolation: all tables `tenant_id`; never trust body `tenantId` or client-supplied `lineUserId` for binding without webhook/auth proof.
- Secrets: channel secret + access token encrypted at rest with `LINE_CREDENTIALS_ENCRYPTION_KEY` (env); mask in API responses; never log.

## Identity linking

1. Staff creates linking invite → opaque token (hash stored, TTL).
2. Customer opens `https://…/line/link?t=…` or LIFF/deep link (MVP: HTTPS deep link that instructs “Add OA then send code `LINK xxxxx`” **or** one-time token consumed on first webhook message matching token — prefer **follow + postback/token message**).
3. MVP link completion: webhook `message` text `LINK <token>` from LINE user → consume token → bind `(tenantId, customerId, lineUserId)`.
4. Reject if `lineUserId` already linked to another customer in tenant; audit link/unlink.

## Installment replies (commands)

Supported text (case-insensitive, Thai+EN synonyms later):

| Command | Behavior |
|---------|----------|
| `BALANCE` / `ยอด` | Outstanding for active contract(s); if multiple, ask to `SELECT <n>` |
| `NEXT` / `งวดถัดไป` | Next unpaid due date + amount |
| `HISTORY` / `ประวัติ` | Last up to 5 paid/partial schedule lines |
| `HELP` | List commands |

Data from existing Prisma schedule + `remainingBalance` helper — same rules as portal.

## Notifications (P0)

| Type | Trigger | Consent |
|------|---------|---------|
| `PAYMENT_CONFIRMATION` | After sandbox payment webhook SUCCEEDED + allocate | Active LINE link + `ConsentType.LINE_MESSAGING` (or PDPA + explicit LINE consent) |
| `PAYMENT_REMINDER` | Staff manual send | Same |
| Scheduled due/overdue blasts | **Out of P0** | — |

Templates: tenant-scoped rows with `{{customerName}}`, `{{contractId}}`, `{{outstandingBalance}}`, `{{dueDate}}`, `{{amount}}`, `{{merchantName}}`.

## Security

- Webhook: LINE-style HMAC (`x-line-signature`) via port; sandbox uses same algorithm with tenant channel secret.
- Idempotency: unique `provider_event_id` (LINE webhook event id / message id).
- Authz: `line.config`, `line.link`, `line.notify` permissions (OWNER all; STAFF link+notify).
- Rate-limit webhook processing per tenant (simple in-memory or DB count — document).
- No contract data without resolved link + ownership check.

## Testing (mandatory)

- Unit: signature verify, link consume, installment query authz, template render, tenant isolation.
- Integration/e2e: webhook replay idempotent; cross-tenant link forbidden; unauthorized balance denied.
- Do not claim production LINE without live credentials evidence.

## Roadmap placement

- **R3-P0** parallel to R2 (allowed by MASTER-EXECUTION-PLAN).
- Does not replace CURRENT-PHASE R2 device work; note only in CURRENT-PHASE as parallel track.
- Production LINE remains BLOCKED per PRODUCT-SCOPE until provider accounts + consent copy (D-051).
