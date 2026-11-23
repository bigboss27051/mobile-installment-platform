# R3-P0 LINE Installment Comms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sandbox LINE channel per tenant: webhook + customer link + installment read replies + payment confirmation / manual reminder templates — without inventing a Unified Inbox or payment gateway.

**Architecture:** Nest `line` module + `NotificationChannelPort` / sandbox LINE adapter; Prisma tables for channel config, links, linking tokens, webhook events, templates, deliveries, audit; installment data via existing schedule/`remainingBalance`; secrets encrypted with env key.

**Tech Stack:** NestJS, Prisma/Postgres, Jest, Merchant Web React (thin settings later).

**Spec:** [../specs/2026-11-22-r3-p0-line-installment-comms-design.md](../specs/2026-11-22-r3-p0-line-installment-comms-design.md)

---

## File map

| Path | Responsibility |
|------|----------------|
| `backend/prisma/schema.prisma` + migration | LINE/comms tables + `ConsentType.LINE_MESSAGING` |
| `backend/src/common/notifications/notification-channel.port.ts` | Port: send text, verify webhook |
| `backend/src/common/notifications/sandbox-line.adapter.ts` | HMAC verify + fake/send log |
| `backend/src/line/*` | Config, webhook, linking, bot, installment query, notify |
| `backend/src/common/authz/permissions.ts` | `line.config`, `line.link`, `line.notify` |
| `apps/merchant-web` | Settings + customer link UI (Task 8) |

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261122100000_r3_p0_line_comms/migration.sql`

- [ ] **Step 1: Add enums and models**

Add to schema:

```prisma
enum ConsentType {
  PDPA_PROCESSING
  MARKETING
  LINE_MESSAGING
}

enum LineChannelStatus {
  DISCONNECTED
  CONNECTED
  ERROR
}

enum LineLinkStatus {
  ACTIVE
  UNLINKED
}

enum LineDeliveryStatus {
  PENDING
  SENT
  FAILED
  SKIPPED
}

enum LineNotifyType {
  PAYMENT_CONFIRMATION
  PAYMENT_REMINDER
  CONTRACT_INFO
}

model LineChannelConfig {
  id                    String            @id @default(uuid()) @db.Uuid
  tenantId              String            @unique @map("tenant_id") @db.Uuid
  channelId             String            @map("channel_id")
  channelSecretEnc      String            @map("channel_secret_enc")
  accessTokenEnc        String            @map("access_token_enc")
  status                LineChannelStatus @default(DISCONNECTED)
  lastWebhookAt         DateTime?         @map("last_webhook_at")
  lastError             String?           @map("last_error")
  createdAt             DateTime          @default(now()) @map("created_at")
  updatedAt             DateTime          @updatedAt @map("updated_at")
  tenant                Tenant            @relation(fields: [tenantId], references: [id])

  @@map("line_channel_configs")
}

model LineCustomerLink {
  id          String         @id @default(uuid()) @db.Uuid
  tenantId    String         @map("tenant_id") @db.Uuid
  customerId  String         @map("customer_id") @db.Uuid
  lineUserId  String         @map("line_user_id")
  status      LineLinkStatus @default(ACTIVE)
  linkedAt    DateTime       @default(now()) @map("linked_at")
  unlinkedAt  DateTime?      @map("unlinked_at")
  displayName String?        @map("display_name")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")
  tenant      Tenant         @relation(fields: [tenantId], references: [id])
  customer    Customer       @relation(fields: [customerId], references: [id])

  @@index([tenantId, customerId])
  @@index([tenantId, lineUserId])
  @@map("line_customer_links")
}

model LineLinkingToken {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  customerId  String    @map("customer_id") @db.Uuid
  tokenHash   String    @map("token_hash")
  expiresAt   DateTime  @map("expires_at")
  consumedAt  DateTime? @map("consumed_at")
  createdById String?   @map("created_by_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  customer    Customer  @relation(fields: [customerId], references: [id])

  @@unique([tenantId, tokenHash])
  @@index([tenantId, customerId])
  @@map("line_linking_tokens")
}

model LineWebhookEvent {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String?   @map("tenant_id") @db.Uuid
  providerEventId String    @unique @map("provider_event_id")
  eventType       String    @map("event_type")
  rawJson         Json      @map("raw_json")
  processedAt     DateTime? @map("processed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  tenant          Tenant?   @relation(fields: [tenantId], references: [id])

  @@map("line_webhook_events")
}

model LineNotificationTemplate {
  id        String         @id @default(uuid()) @db.Uuid
  tenantId  String         @map("tenant_id") @db.Uuid
  type      LineNotifyType
  body      String
  enabled   Boolean        @default(true)
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")
  tenant    Tenant         @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, type])
  @@map("line_notification_templates")
}

model LineNotificationDelivery {
  id                String             @id @default(uuid()) @db.Uuid
  tenantId          String             @map("tenant_id") @db.Uuid
  customerId        String             @map("customer_id") @db.Uuid
  contractId        String?            @map("contract_id") @db.Uuid
  type              LineNotifyType
  status            LineDeliveryStatus @default(PENDING)
  idempotencyKey    String             @map("idempotency_key")
  providerMessageId String?            @map("provider_message_id")
  errorMessage      String?            @map("error_message")
  bodyRendered      String?            @map("body_rendered")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  tenant            Tenant             @relation(fields: [tenantId], references: [id])
  customer          Customer           @relation(fields: [customerId], references: [id])

  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, customerId])
  @@map("line_notification_deliveries")
}

model LineAuditEvent {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  customerId String?  @map("customer_id") @db.Uuid
  actorUserId String? @map("actor_user_id") @db.Uuid
  action     String
  reason     String?
  metaJson   Json?    @map("meta_json")
  createdAt  DateTime @default(now()) @map("created_at")
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@map("line_audit_events")
}
```

Wire relations on `Tenant` and `Customer`. Add partial unique for one ACTIVE link per `(tenant_id, line_user_id)` and `(tenant_id, customer_id)` in SQL migration.

- [ ] **Step 2: Create migration SQL** matching Prisma + partial uniques:

```sql
CREATE UNIQUE INDEX line_customer_links_active_line_user
  ON line_customer_links (tenant_id, line_user_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX line_customer_links_active_customer
  ON line_customer_links (tenant_id, customer_id) WHERE status = 'ACTIVE';
```

- [ ] **Step 3: Run** `cd backend && npx prisma migrate deploy && npx prisma generate`

---

### Task 2: NotificationChannelPort + sandbox LINE adapter (TDD)

**Files:**
- Create: `backend/src/common/notifications/notification-channel.port.ts`
- Create: `backend/src/common/notifications/sandbox-line.adapter.ts`
- Create: `backend/src/common/notifications/sandbox-line.adapter.spec.ts`
- Create: `backend/src/common/notifications/line-credentials-crypto.ts`
- Create: `backend/src/common/notifications/notifications.module.ts`

- [ ] **Step 1: Write failing tests** for HMAC verify (LINE-compatible: base64 HMAC-SHA256 of body with channel secret) and reject wrong signature.

```typescript
import { createHmac } from 'crypto';
import { SandboxLineAdapter, signLineWebhook } from './sandbox-line.adapter';

describe('SandboxLineAdapter', () => {
  const secret = 'channel-secret-test';
  const adapter = new SandboxLineAdapter();

  it('accepts valid x-line-signature', () => {
    const body = Buffer.from('{"events":[]}');
    const sig = signLineWebhook(body, secret);
    expect(adapter.verifyWebhookSignature({ 'x-line-signature': sig }, body, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    const body = Buffer.from('{"events":[]}');
    expect(
      adapter.verifyWebhookSignature({ 'x-line-signature': 'nope' }, body, secret),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

`cd backend && npm test -- sandbox-line.adapter.spec.ts`

- [ ] **Step 3: Implement** `signLineWebhook`, `verifyWebhookSignature`, `sendTextMessage` (records to in-memory or returns fake `mid_…` id). Port:

```typescript
export type SendTextInput = {
  accessToken: string;
  toLineUserId: string;
  text: string;
};

export interface NotificationChannelPort {
  verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
    channelSecret: string,
  ): boolean;
  sendTextMessage(input: SendTextInput): Promise<{ providerMessageId: string }>;
}

export const NOTIFICATION_CHANNEL = Symbol('NOTIFICATION_CHANNEL');
```

- [ ] **Step 4: Tests pass; encrypt helpers** AES-256-GCM with `LINE_CREDENTIALS_ENCRYPTION_KEY` (32-byte hex/base64) — unit test round-trip.

---

### Task 3: Permissions + Line module skeleton + config API

**Files:**
- Modify: `backend/src/common/authz/permissions.ts`
- Modify: `backend/src/config/env.validation.ts` — require `LINE_CREDENTIALS_ENCRYPTION_KEY` (min length) for lab; optional flag `LINE_SANDBOX=true`
- Create: `backend/src/line/line.module.ts`, `line-config.service.ts`, `line-config.controller.ts`, DTOs
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/line/line-config.service.spec.ts`

- [ ] Permissions: add `'line.config' | 'line.link' | 'line.notify'` to `PERMISSIONS` (all roles that currently get device perms get these; STAFF gets all three for P0).

- [ ] Staff `PUT /api/v1/line/config` body `{ channelId, channelSecret, accessToken }` → encrypt store, status CONNECTED.  
  `GET /api/v1/line/config` → `{ status, channelId, maskedSecret: '****', lastWebhookAt }` never raw secrets.  
  `DELETE /api/v1/line/config` → DISCONNECTED / wipe secrets.

- [ ] Tests: tenant isolation (config of A not visible to B); secrets masked.

---

### Task 4: Webhook controller + idempotent processing

**Files:**
- Create: `backend/src/line/line-webhook.controller.ts`
- Create: `backend/src/line/line-webhook.service.ts`
- Create: `backend/src/line/line-webhook.service.spec.ts`

- [ ] `POST /api/v1/webhooks/line/:tenantId` — resolve tenant config, decrypt secret, verify signature, parse events, insert `LineWebhookEvent` by `providerEventId` (message.id / event webhookEventId); on unique conflict return `{ replay: true }` without re-handling.

- [ ] On text message matching `/^LINK\s+(\S+)/i` → linking service.  
  On `BALANCE`/`NEXT`/`HISTORY`/`HELP` → bot handler.

- [ ] Tests: bad signature 401; replay no double link; wrong tenant secret fails.

---

### Task 5: Customer linking service

**Files:**
- Create: `backend/src/line/line-linking.service.ts`, controller methods under `line/customers/:customerId/link`
- Create: `backend/src/line/line-linking.service.spec.ts`

- [ ] `POST .../link-invites` → raw token returned once; hash stored; TTL 24h.  
- [ ] Consume via webhook `LINK <token>` → ACTIVE link; audit.  
- [ ] Unlink: set UNLINKED + audit.  
- [ ] Duplicate `lineUserId` → conflict.  
- [ ] Never bind from client-supplied lineUserId without webhook path.

---

### Task 6: Installment query for LINE

**Files:**
- Create: `backend/src/line/line-installment-query.service.ts` + spec

- [ ] Given `tenantId` + `customerId`, load contracts/schedules; compute outstanding with `remainingBalance`; next unpaid due; history.  
- [ ] No float; reuse portal patterns.  
- [ ] Test: customer A cannot query customer B even same tenant if IDs swapped (service always scopes by link’s customerId).

---

### Task 7: Templates + payment confirmation + manual reminder

**Files:**
- Create: `backend/src/line/line-notify.service.ts` + spec
- Modify: `backend/src/payments/payments.service.ts` — after successful allocate, call notify (try/catch; payment must not fail)

- [ ] Default templates seeded on first config connect.  
- [ ] `sendPaymentConfirmation({ tenantId, customerId, contractId, amount, paymentTxId })` idempotency key `payconfirm:{txId}`.  
- [ ] Skip if no ACTIVE link or no LINE_MESSAGING consent.  
- [ ] Staff `POST /api/v1/line/notifications/reminder` with contractId + Idempotency-Key.

---

### Task 8: Merchant Web thin UI

**Files:**
- Create: `apps/merchant-web/src/pages/LineSettingsPage.tsx` (or similar existing router pattern)
- Modify: customer detail to show link status + “Create invite” + show token once

- [ ] Follow existing UI primitives; no new design system.  
- [ ] Mask secrets; show CONNECTED/DISCONNECTED.

---

### Task 9: Docs + decision + backlog

**Files:**
- Modify: `docs/project-management/DECISION-LOG.md` (D-066)
- Modify: `docs/roadmap/CURRENT-PHASE.md` (parallel R3-P0 note)
- Modify: `docs/project-management/TASK-BACKLOG.md` (R3-P0 items)
- Modify: `docs/architecture/INTEGRATION-ARCHITECTURE.md` (sandbox LINE note)

---

## Acceptance (P0)

1. Merchant configures sandbox LINE credentials (encrypted).  
2. Webhook verifies signature; replay is idempotent.  
3. Staff invite + customer `LINK <token>` binds LINE user.  
4. Linked customer can BALANCE/NEXT/HISTORY from LINE webhook.  
5. Payment confirmation delivery logged once per tx.  
6. Cross-tenant isolation tests pass.  
7. Production LINE still documented BLOCKED.
