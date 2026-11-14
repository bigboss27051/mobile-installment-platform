-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "EnrollmentSessionStatus" AS ENUM ('WAITING_FOR_DEVICE', 'PROVISIONING', 'ENROLLING', 'VERIFYING', 'ACTIVATING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'RECOVERY_REQUIRED');

-- CreateTable
CREATE TABLE "device_enrollment_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "imei_unit_id" UUID NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "status" "EnrollmentSessionStatus" NOT NULL DEFAULT 'WAITING_FOR_DEVICE',
    "token_hash" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "qr_fingerprint" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_enrollment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_enrollment_sessions_token_hash_key" ON "device_enrollment_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "device_enrollment_sessions_tenant_id_idempotency_key_key" ON "device_enrollment_sessions"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "device_enrollment_sessions_tenant_id_contract_id_status_idx" ON "device_enrollment_sessions"("tenant_id", "contract_id", "status");

-- CreateIndex
CREATE INDEX "device_enrollment_sessions_tenant_id_status_expires_at_idx" ON "device_enrollment_sessions"("tenant_id", "status", "expires_at");

-- AddForeignKey
ALTER TABLE "device_enrollment_sessions" ADD CONSTRAINT "device_enrollment_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_enrollment_sessions" ADD CONSTRAINT "device_enrollment_sessions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_enrollment_sessions" ADD CONSTRAINT "device_enrollment_sessions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
