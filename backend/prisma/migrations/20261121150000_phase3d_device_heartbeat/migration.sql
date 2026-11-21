-- Phase 3d: agent heartbeat timestamp on devices
ALTER TABLE "devices" ADD COLUMN "last_heartbeat_at" TIMESTAMP(3);

CREATE INDEX "devices_tenant_id_last_heartbeat_at_idx" ON "devices"("tenant_id", "last_heartbeat_at");
