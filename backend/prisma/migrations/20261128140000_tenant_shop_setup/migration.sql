-- Shop Android checklist. Booleans have no defaults so a new row cannot look ready.
CREATE TABLE "tenant_shop_setups" (
    "tenant_id" UUID NOT NULL,
    "dpc_attested" BOOLEAN NOT NULL,
    "google_account_ready" BOOLEAN NOT NULL,
    "wipe_needs_on_device_unlock" BOOLEAN NOT NULL,
    "no_remote_frp_bypass" BOOLEAN NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_shop_setups_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "tenant_shop_setups" ADD CONSTRAINT "tenant_shop_setups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_shop_setups" ADD CONSTRAINT "tenant_shop_setups_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
