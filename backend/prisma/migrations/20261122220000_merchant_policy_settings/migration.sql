-- AlterEnum DeviceAuditAction
ALTER TYPE "DeviceAuditAction" ADD VALUE IF NOT EXISTS 'POLICY_SETTINGS';
ALTER TYPE "DeviceAuditAction" ADD VALUE IF NOT EXISTS 'LOCK_APPROVAL';

-- CreateEnum
CREATE TYPE "DeviceLockApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable device_audit_events: nullable device_id for tenant-level audits
ALTER TABLE "device_audit_events" ALTER COLUMN "device_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tenant_device_policy_settings" (
    "tenant_id" UUID NOT NULL,
    "reminder_after_days" INTEGER NOT NULL DEFAULT 1,
    "restrict_after_days" INTEGER NOT NULL DEFAULT 3,
    "lock_after_days" INTEGER NOT NULL DEFAULT 7,
    "auto_evaluate_cron_enabled" BOOLEAN NOT NULL DEFAULT true,
    "require_lock_approval" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_device_policy_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "device_lock_approvals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "status" "DeviceLockApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "overdue_days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" UUID,
    "resolve_idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_lock_approvals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tenant_device_policy_settings" ADD CONSTRAINT "tenant_device_policy_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_lock_approvals" ADD CONSTRAINT "device_lock_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_lock_approvals" ADD CONSTRAINT "device_lock_approvals_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_lock_approvals" ADD CONSTRAINT "device_lock_approvals_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE UNIQUE INDEX "device_lock_approvals_tenant_id_resolve_idempotency_key_key" ON "device_lock_approvals"("tenant_id", "resolve_idempotency_key");

CREATE INDEX "device_lock_approvals_tenant_id_status_requested_at_idx" ON "device_lock_approvals"("tenant_id", "status", "requested_at");

CREATE INDEX "device_lock_approvals_device_id_status_idx" ON "device_lock_approvals"("device_id", "status");

CREATE UNIQUE INDEX "device_lock_approvals_one_pending_per_device" ON "device_lock_approvals"("device_id") WHERE status = 'PENDING';
