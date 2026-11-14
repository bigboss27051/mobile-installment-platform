import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);

  function ctxWithUser(user: { role: PlatformRole | null } | undefined) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows when no permissions are required on the handler', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxWithUser({ role: PlatformRole.MERCHANT_STAFF }))).toBe(
      true,
    );
  });

  it('allows staff when they have the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['devices.enroll']);
    expect(guard.canActivate(ctxWithUser({ role: PlatformRole.MERCHANT_STAFF }))).toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      PERMISSIONS_KEY,
      expect.any(Array),
    );
  });

  it('forbids staff when devices.unbind is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['devices.unbind']);
    expect(() =>
      guard.canActivate(ctxWithUser({ role: PlatformRole.MERCHANT_STAFF })),
    ).toThrow(ForbiddenException);
  });

  it('allows owner for devices.unbind', () => {
    reflector.getAllAndOverride.mockReturnValue(['devices.unbind']);
    expect(guard.canActivate(ctxWithUser({ role: PlatformRole.MERCHANT_OWNER }))).toBe(
      true,
    );
  });

  it('forbids when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['devices.enroll']);
    expect(() => guard.canActivate(ctxWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
