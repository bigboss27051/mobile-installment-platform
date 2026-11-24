ALTER TABLE "contracts" ADD COLUMN "contract_number" TEXT;

WITH numbered AS (
  SELECT
    id,
    'C' || lpad(
      row_number() OVER (PARTITION BY tenant_id ORDER BY created_at, id)::text,
      6,
      '0'
    ) AS contract_number
  FROM "contracts"
)
UPDATE "contracts" AS c
SET "contract_number" = numbered.contract_number
FROM numbered
WHERE c.id = numbered.id;

ALTER TABLE "contracts" ALTER COLUMN "contract_number" SET NOT NULL;

CREATE UNIQUE INDEX "contracts_tenant_id_contract_number_key"
  ON "contracts"("tenant_id", "contract_number");
