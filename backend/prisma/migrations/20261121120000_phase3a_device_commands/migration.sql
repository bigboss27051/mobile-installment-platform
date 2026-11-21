-- CreateEnum
CREATE TYPE "DeviceCommandType" AS ENUM ('START_LOCK_TASK', 'STOP_LOCK_TASK');

-- CreateEnum
CREATE TYPE "DeviceCommandStatus" AS ENUM ('QUEUED', 'SENT', 'ACKED_SUCCESS', 'ACKED_FAILED', 'EXPIRED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "DesiredPresentation" AS ENUM ('NONE', 'REMINDER', 'RESTRICT', 'LOCK');

-- CreateEnum
CREATE TYPE "PlatformEnforcementState" AS ENUM ('NONE', 'PACKAGES_SUSPENDED', 'LOCK_TASK', 'SINGLE_APP_MODE', 'UNSUPPORTED', 'PENDING');

-- AlterEnum
ALTER TYPE "DeviceAuditAction" ADD VALUE 'COMMAND';

-- AlterTable
ALTER TABLE "devices" ADD COLUMN "agent_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "devices_agent_token_hash_key" ON "devices"("agent_token_hash");

-- CreateTable
CREATE TABLE "device_commands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "type" "DeviceCommandType" NOT NULL,
    "status" "DeviceCommandStatus" NOT NULL DEFAULT 'QUEUED',
    "reason" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "result_code" TEXT,
    "acked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_policy_states" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "desired_presentation" "DesiredPresentation" NOT NULL DEFAULT 'NONE',
    "platform_state" "PlatformEnforcementState" NOT NULL DEFAULT 'NONE',
    "policy_version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "device_policy_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_commands_tenant_id_device_id_status_idx" ON "device_commands"("tenant_id", "device_id", "status");

-- CreateIndex
CREATE INDEX "device_commands_device_id_status_expires_at_idx" ON "device_commands"("device_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_policy_states_device_id_key" ON "device_policy_states"("device_id");

-- CreateIndex
CREATE INDEX "device_policy_states_tenant_id_device_id_idx" ON "device_policy_states"("tenant_id", "device_id");

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_policy_states" ADD CONSTRAINT "device_policy_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_policy_states" ADD CONSTRAINT "device_policy_states_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
