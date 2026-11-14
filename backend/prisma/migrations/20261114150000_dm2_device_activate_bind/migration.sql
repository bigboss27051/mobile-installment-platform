-- CreateEnum
CREATE TYPE "DeviceLifecycleStatus" AS ENUM ('PENDING_ENROLL', 'ENROLLED', 'ACTIVE', 'UNENROLLED');

-- CreateEnum
CREATE TYPE "DeviceBindingStatus" AS ENUM ('ACTIVE', 'UNBOUND', 'REPLACED');

-- CreateEnum
CREATE TYPE "DeviceAuditAction" AS ENUM ('ACTIVATE', 'BIND', 'UNBIND');

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "imei_unit_id" UUID NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "status" "DeviceLifecycleStatus" NOT NULL DEFAULT 'PENDING_ENROLL',
    "hardware_fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_activations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "enrollment_session_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "shop_code" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_contract_bindings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "imei_unit_id" UUID NOT NULL,
    "status" "DeviceBindingStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "bind_idempotency_key" TEXT NOT NULL,
    "unbind_reason" TEXT,
    "unbind_actor_user_id" UUID,
    "unbind_idempotency_key" TEXT,
    "bound_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unbound_at" TIMESTAMP(3),

    CONSTRAINT "device_contract_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "DeviceAuditAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_audit_events_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "device_enrollment_sessions" ADD COLUMN "device_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "devices_tenant_id_hardware_fingerprint_key" ON "devices"("tenant_id", "hardware_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "devices_tenant_id_imei_unit_id_key" ON "devices"("tenant_id", "imei_unit_id");

-- CreateIndex
CREATE INDEX "devices_tenant_id_status_idx" ON "devices"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_activations_device_id_key" ON "device_activations"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_activations_enrollment_session_id_key" ON "device_activations"("enrollment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_activations_tenant_id_idempotency_key_key" ON "device_activations"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "device_activations_tenant_id_contract_id_idx" ON "device_activations"("tenant_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_contract_bindings_tenant_id_bind_idempotency_key_key" ON "device_contract_bindings"("tenant_id", "bind_idempotency_key");

-- CreateIndex
CREATE INDEX "device_contract_bindings_tenant_id_device_id_status_idx" ON "device_contract_bindings"("tenant_id", "device_id", "status");

-- CreateIndex
CREATE INDEX "device_contract_bindings_tenant_id_contract_id_status_idx" ON "device_contract_bindings"("tenant_id", "contract_id", "status");

-- CreateIndex
CREATE INDEX "device_contract_bindings_tenant_id_imei_unit_id_status_idx" ON "device_contract_bindings"("tenant_id", "imei_unit_id", "status");

-- Partial unique: one ACTIVE bind per device and per IMEI
CREATE UNIQUE INDEX "device_contract_bindings_one_active_device"
ON "device_contract_bindings" ("device_id") WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX "device_contract_bindings_one_active_imei"
ON "device_contract_bindings" ("imei_unit_id") WHERE status = 'ACTIVE';

-- CreateIndex
CREATE INDEX "device_audit_events_tenant_id_device_id_created_at_idx" ON "device_audit_events"("tenant_id", "device_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_enrollment_sessions_device_id_key" ON "device_enrollment_sessions"("device_id");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_imei_unit_id_fkey" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_enrollment_session_id_fkey" FOREIGN KEY ("enrollment_session_id") REFERENCES "device_enrollment_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activations" ADD CONSTRAINT "device_activations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_contract_bindings" ADD CONSTRAINT "device_contract_bindings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_contract_bindings" ADD CONSTRAINT "device_contract_bindings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_contract_bindings" ADD CONSTRAINT "device_contract_bindings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_contract_bindings" ADD CONSTRAINT "device_contract_bindings_imei_unit_id_fkey" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_contract_bindings" ADD CONSTRAINT "device_contract_bindings_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_audit_events" ADD CONSTRAINT "device_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_audit_events" ADD CONSTRAINT "device_audit_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_audit_events" ADD CONSTRAINT "device_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_enrollment_sessions" ADD CONSTRAINT "device_enrollment_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
