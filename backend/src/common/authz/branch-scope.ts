import { ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { TenantContext } from '../tenant/tenant-context';

/** OWNER / SUPER_ADMIN see all tenant branches. */
export function hasAllBranchAccess(ctx: TenantContext): boolean {
  return (
    ctx.role === PlatformRole.MERCHANT_OWNER ||
    ctx.role === PlatformRole.SUPER_ADMIN
  );
}

export function assertBranchAccess(ctx: TenantContext, branchId: string): void {
  if (hasAllBranchAccess(ctx)) {
    return;
  }
  const allowed = ctx.branchIds ?? [];
  if (!allowed.includes(branchId)) {
    throw new ForbiddenException('BRANCH_ACCESS_DENIED');
  }
}

/** Prisma `where` fragment for branchId filtering. */
export function branchIdFilter(
  ctx: TenantContext,
): { branchId?: string | { in: string[] } } {
  if (hasAllBranchAccess(ctx)) {
    return {};
  }
  const allowed = ctx.branchIds ?? [];
  return { branchId: { in: allowed } };
}
