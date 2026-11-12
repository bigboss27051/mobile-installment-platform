-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScheduleItemStatus" AS ENUM ('PENDING');

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "imei_unit_id" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "principal" DECIMAL(18,2) NOT NULL,
    "down_payment" DECIMAL(18,2) NOT NULL,
    "financed_amount" DECIMAL(18,2) NOT NULL,
    "term_months" INTEGER NOT NULL,
    "interest_method" "InterestMethod" NOT NULL,
    "annual_rate" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'THB',
    "activated_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "terms_json" JSONB NOT NULL,
    "schedule_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedule_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "contract_version_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "principal_due" DECIMAL(18,2) NOT NULL,
    "interest_due" DECIMAL(18,2) NOT NULL,
    "fees_due" DECIMAL(18,2) NOT NULL,
    "total_due" DECIMAL(18,2) NOT NULL,
    "status" "ScheduleItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "payment_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_tenant_id_status_idx" ON "contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_application_id_idx" ON "contracts"("tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_open_application_unique"
ON "contracts" ("tenant_id", "application_id")
WHERE status IN ('DRAFT', 'ACTIVE');

-- CreateIndex
CREATE INDEX "contract_versions_tenant_id_idx" ON "contract_versions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contract_id_version_key" ON "contract_versions"("contract_id", "version");

-- CreateIndex
CREATE INDEX "payment_schedule_items_tenant_id_contract_id_idx" ON "payment_schedule_items"("tenant_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedule_items_contract_version_id_seq_key" ON "payment_schedule_items"("contract_version_id", "seq");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_imei_unit_id_fkey" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_items_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_items_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
