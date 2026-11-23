-- CreateTable
CREATE TABLE "user_branch_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_branch_assignments_tenant_id_user_id_idx" ON "user_branch_assignments"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_branch_assignments_tenant_id_branch_id_idx" ON "user_branch_assignments"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_branch_assignments_user_id_branch_id_key" ON "user_branch_assignments"("user_id", "branch_id");

-- AddForeignKey
ALTER TABLE "user_branch_assignments" ADD CONSTRAINT "user_branch_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_assignments" ADD CONSTRAINT "user_branch_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_assignments" ADD CONSTRAINT "user_branch_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
