-- Phase 3g soft location (arrears-only, D-061)

CREATE TYPE "DeviceLocationSource" AS ENUM ('NETWORK', 'GPS', 'FUSED', 'UNKNOWN');

ALTER TYPE "DeviceAuditAction" ADD VALUE IF NOT EXISTS 'LOCATION_READ';

ALTER TABLE "devices"
  ADD COLUMN "last_location_lat" DECIMAL(10, 7),
  ADD COLUMN "last_location_lng" DECIMAL(10, 7),
  ADD COLUMN "last_location_accuracy_m" INTEGER,
  ADD COLUMN "last_location_source" "DeviceLocationSource",
  ADD COLUMN "last_location_at" TIMESTAMP(3);

CREATE TABLE "device_location_samples" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "lat" DECIMAL(10, 7) NOT NULL,
  "lng" DECIMAL(10, 7) NOT NULL,
  "accuracy_meters" INTEGER,
  "source" "DeviceLocationSource" NOT NULL,
  "captured_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_location_samples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_location_samples_tenant_id_device_id_captured_at_idx"
  ON "device_location_samples"("tenant_id", "device_id", "captured_at");

CREATE INDEX "device_location_samples_captured_at_idx"
  ON "device_location_samples"("captured_at");

ALTER TABLE "device_location_samples"
  ADD CONSTRAINT "device_location_samples_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_location_samples"
  ADD CONSTRAINT "device_location_samples_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "devices"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
