-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'LINE_MESSAGING';

-- CreateEnum
CREATE TYPE "LineChannelStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');
CREATE TYPE "LineLinkStatus" AS ENUM ('ACTIVE', 'UNLINKED');
CREATE TYPE "LineDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "LineNotifyType" AS ENUM ('PAYMENT_CONFIRMATION', 'PAYMENT_REMINDER', 'CONTRACT_INFO');

-- CreateTable
CREATE TABLE "line_channel_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_secret_enc" TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "status" "LineChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "last_webhook_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_channel_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_channel_configs_tenant_id_key" ON "line_channel_configs"("tenant_id");
ALTER TABLE "line_channel_configs" ADD CONSTRAINT "line_channel_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "line_customer_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "status" "LineLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMPTZ,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_customer_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "line_customer_links_tenant_id_customer_id_idx" ON "line_customer_links"("tenant_id", "customer_id");
CREATE INDEX "line_customer_links_tenant_id_line_user_id_idx" ON "line_customer_links"("tenant_id", "line_user_id");
CREATE UNIQUE INDEX "line_customer_links_active_line_user" ON "line_customer_links"("tenant_id", "line_user_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "line_customer_links_active_customer" ON "line_customer_links"("tenant_id", "customer_id") WHERE "status" = 'ACTIVE';
ALTER TABLE "line_customer_links" ADD CONSTRAINT "line_customer_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "line_customer_links" ADD CONSTRAINT "line_customer_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "line_linking_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_linking_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_linking_tokens_tenant_id_token_hash_key" ON "line_linking_tokens"("tenant_id", "token_hash");
CREATE INDEX "line_linking_tokens_tenant_id_customer_id_idx" ON "line_linking_tokens"("tenant_id", "customer_id");
ALTER TABLE "line_linking_tokens" ADD CONSTRAINT "line_linking_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "line_linking_tokens" ADD CONSTRAINT "line_linking_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "line_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "raw_json" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_webhook_events_provider_event_id_key" ON "line_webhook_events"("provider_event_id");
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "line_notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "LineNotifyType" NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_notification_templates_tenant_id_type_key" ON "line_notification_templates"("tenant_id", "type");
ALTER TABLE "line_notification_templates" ADD CONSTRAINT "line_notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "line_notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contract_id" UUID,
    "type" "LineNotifyType" NOT NULL,
    "status" "LineDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "body_rendered" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_notification_deliveries_tenant_id_idempotency_key_key" ON "line_notification_deliveries"("tenant_id", "idempotency_key");
CREATE INDEX "line_notification_deliveries_tenant_id_customer_id_idx" ON "line_notification_deliveries"("tenant_id", "customer_id");
ALTER TABLE "line_notification_deliveries" ADD CONSTRAINT "line_notification_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "line_notification_deliveries" ADD CONSTRAINT "line_notification_deliveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "line_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "meta_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "line_audit_events_tenant_id_created_at_idx" ON "line_audit_events"("tenant_id", "created_at");
ALTER TABLE "line_audit_events" ADD CONSTRAINT "line_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
