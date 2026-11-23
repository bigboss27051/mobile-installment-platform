import { ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import {
  assertBranchAccess,
  branchIdFilter,
  hasAllBranchAccess,
} from './branch-scope';

describe('branch-scope', () => {
  it('OWNER has all branch access', () => {
    expect(
      hasAllBranchAccess({
        userId: 'u',
        tenantId: 't',
        role: PlatformRole.MERCHANT_OWNER,
        branchIds: null,
      }),
    ).toBe(true);
    expect(
      branchIdFilter({
        userId: 'u',
        tenantId: 't',
        role: PlatformRole.MERCHANT_OWNER,
        branchIds: null,
      }),
    ).toEqual({});
  });

  it('STAFF only allowed assigned branches', () => {
    const ctx = {
      userId: 'u',
      tenantId: 't',
      role: PlatformRole.MERCHANT_STAFF,
      branchIds: ['b1'],
    };
    expect(() => assertBranchAccess(ctx, 'b1')).not.toThrow();
    expect(() => assertBranchAccess(ctx, 'b2')).toThrow(ForbiddenException);
    expect(branchIdFilter(ctx)).toEqual({ branchId: { in: ['b1'] } });
  });
});
