-- DropForeignKey
ALTER TABLE "customer_line_links" DROP CONSTRAINT "customer_line_links_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_line_links" DROP CONSTRAINT "customer_line_links_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "line_link_challenges" DROP CONSTRAINT "line_link_challenges_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "line_link_challenges" DROP CONSTRAINT "line_link_challenges_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "line_notification_outbox" DROP CONSTRAINT "line_notification_outbox_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "line_notification_outbox" DROP CONSTRAINT "line_notification_outbox_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "line_webhook_events" DROP CONSTRAINT "line_webhook_events_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_line_integrations" DROP CONSTRAINT "tenant_line_integrations_tenant_id_fkey";

-- DropIndex
DROP INDEX "payment_intents_created_by_customer_id_idx";

-- AddForeignKey
ALTER TABLE "tenant_line_integrations" ADD CONSTRAINT "tenant_line_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_line_links" ADD CONSTRAINT "customer_line_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_line_links" ADD CONSTRAINT "customer_line_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_link_challenges" ADD CONSTRAINT "line_link_challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_link_challenges" ADD CONSTRAINT "line_link_challenges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_notification_outbox" ADD CONSTRAINT "line_notification_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_notification_outbox" ADD CONSTRAINT "line_notification_outbox_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "line_notification_outbox_status_next_attempt_at_locked_until_id" RENAME TO "line_notification_outbox_status_next_attempt_at_locked_unti_idx";
