-- Devices without a cellular radio have no IMEI. A stock unit needs one identity.
ALTER TABLE "imei_units" ALTER COLUMN "imei" DROP NOT NULL;
ALTER TABLE "imei_units" ADD COLUMN "serial" TEXT;
CREATE UNIQUE INDEX "imei_units_tenant_id_serial_key" ON "imei_units"("tenant_id", "serial");
ALTER TABLE "imei_units" ADD CONSTRAINT "imei_units_identity_required" CHECK ("imei" IS NOT NULL OR "serial" IS NOT NULL);
