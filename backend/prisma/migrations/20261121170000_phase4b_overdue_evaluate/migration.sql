CREATE TABLE "device_policy_evaluation_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "idempotency_key" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id"),
  "reason" TEXT NOT NULL,
  "summary_json" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "device_policy_evaluation_runs_tenant_id_idempotency_key_key"
    UNIQUE ("tenant_id", "idempotency_key")
);
CREATE INDEX "device_policy_evaluation_runs_tenant_id_created_at_idx"
  ON "device_policy_evaluation_runs" ("tenant_id", "created_at");