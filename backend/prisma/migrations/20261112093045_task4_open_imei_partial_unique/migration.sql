CREATE UNIQUE INDEX IF NOT EXISTS applications_open_imei_unique_idx
ON applications (tenant_id, imei_unit_id)
WHERE status IN ('DRAFT', 'SUBMITTED');
