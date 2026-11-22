ALTER TYPE "ConsentType" ADD VALUE 'LINE_NOTIFICATIONS';

CREATE TYPE "LineNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "LineNotificationKind" AS ENUM ('DUE_REMINDER', 'OVERDUE_REMINDER', 'PAYMENT_CONFIRMATION');

CREATE TABLE "tenant_line_integrations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_access_token_encrypted" TEXT NOT NULL,
    "channel_secret_encrypted" TEXT NOT NULL,
    "official_account_url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_line_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_line_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "customer_line_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "line_link_challenges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_link_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "line_webhook_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "line_notification_outbox" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "kind" "LineNotificationKind" NOT NULL,
    "status" "LineNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "line_notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_line_integrations_tenant_id_key" ON "tenant_line_integrations"("tenant_id");
CREATE UNIQUE INDEX "customer_line_links_customer_id_key" ON "customer_line_links"("customer_id");
CREATE UNIQUE INDEX "customer_line_links_tenant_id_line_user_id_key" ON "customer_line_links"("tenant_id", "line_user_id");
CREATE INDEX "customer_line_links_tenant_id_customer_id_revoked_at_idx" ON "customer_line_links"("tenant_id", "customer_id", "revoked_at");
CREATE INDEX "line_link_challenges_tenant_id_customer_id_created_at_idx" ON "line_link_challenges"("tenant_id", "customer_id", "created_at");
CREATE INDEX "line_link_challenges_tenant_id_code_hash_expires_at_idx" ON "line_link_challenges"("tenant_id", "code_hash", "expires_at");
CREATE UNIQUE INDEX "line_webhook_events_tenant_id_event_id_key" ON "line_webhook_events"("tenant_id", "event_id");
CREATE INDEX "line_webhook_events_tenant_id_created_at_idx" ON "line_webhook_events"("tenant_id", "created_at");
CREATE UNIQUE INDEX "line_notification_outbox_tenant_id_idempotency_key_key" ON "line_notification_outbox"("tenant_id", "idempotency_key");
CREATE INDEX "line_notification_outbox_status_next_attempt_at_locked_until_idx" ON "line_notification_outbox"("status", "next_attempt_at", "locked_until");
CREATE INDEX "line_notification_outbox_tenant_id_customer_id_created_at_idx" ON "line_notification_outbox"("tenant_id", "customer_id", "created_at");

ALTER TABLE "tenant_line_integrations" ADD CONSTRAINT "tenant_line_integrations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_line_links" ADD CONSTRAINT "customer_line_links_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_line_links" ADD CONSTRAINT "customer_line_links_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "line_link_challenges" ADD CONSTRAINT "line_link_challenges_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "line_link_challenges" ADD CONSTRAINT "line_link_challenges_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "line_notification_outbox" ADD CONSTRAINT "line_notification_outbox_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "line_notification_outbox" ADD CONSTRAINT "line_notification_outbox_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
