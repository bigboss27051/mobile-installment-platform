CREATE TYPE "DeviceRecoveryType" AS ENUM ('REENROLL', 'REPLACE', 'UNENROLL', 'RELEASE', 'CONTRACT_CLOSE');
CREATE TYPE "DeviceRecoveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
ALTER TYPE "DeviceAuditAction" ADD VALUE 'RECOVERY';

CREATE TABLE "device_recovery_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "type" "DeviceRecoveryType" NOT NULL,
    "status" "DeviceRecoveryStatus" NOT NULL DEFAULT 'APPROVED',
    "reason" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "device_recovery_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_recovery_requests_tenant_id_device_id_status_idx" ON "device_recovery_requests"("tenant_id", "device_id", "status");

ALTER TABLE "device_recovery_requests" ADD CONSTRAINT "device_recovery_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_recovery_requests" ADD CONSTRAINT "device_recovery_requests_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_recovery_requests" ADD CONSTRAINT "device_recovery_requests_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
