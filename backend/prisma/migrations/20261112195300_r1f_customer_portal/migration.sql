-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "slug" TEXT;

UPDATE "tenants"
SET "slug" = 'tenant-' || substr(replace("id"::text, '-', ''), 1, 8)
WHERE "slug" IS NULL;

ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- AlterTable
ALTER TABLE "payment_intents" ALTER COLUMN "created_by_user_id" DROP NOT NULL;

ALTER TABLE "payment_intents" ADD COLUMN "created_by_customer_id" UUID;

ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_created_by_customer_id_fkey" FOREIGN KEY ("created_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payment_intents_created_by_customer_id_idx" ON "payment_intents"("created_by_customer_id");

-- CreateTable
CREATE TABLE "customer_otp_challenges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_otp_challenges_tenant_id_phone_created_at_idx" ON "customer_otp_challenges"("tenant_id", "phone", "created_at");

ALTER TABLE "customer_otp_challenges" ADD CONSTRAINT "customer_otp_challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_otp_challenges" ADD CONSTRAINT "customer_otp_challenges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
