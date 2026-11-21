import { PlatformRole } from '@prisma/client';
import { hasPermission, permissionsForRole } from './permissions';

describe('permissionsForRole', () => {
  it('gives MERCHANT_OWNER every Phase 3a permission including unbind', () => {
    const perms = permissionsForRole(PlatformRole.MERCHANT_OWNER);
    expect(perms).toEqual(
      expect.arrayContaining([
        'applications.decide',
        'contracts.activate',
        'devices.enroll',
        'devices.activate',
        'devices.bind',
        'devices.unbind',
        'devices.command',
      ]),
    );
    expect(hasPermission(PlatformRole.MERCHANT_OWNER, 'devices.unbind')).toBe(
      true,
    );
  });

  it('gives MERCHANT_STAFF enroll/bind but not unbind', () => {
    expect(hasPermission(PlatformRole.MERCHANT_STAFF, 'devices.enroll')).toBe(
      true,
    );
    expect(hasPermission(PlatformRole.MERCHANT_STAFF, 'devices.bind')).toBe(
      true,
    );
    expect(hasPermission(PlatformRole.MERCHANT_STAFF, 'devices.unbind')).toBe(
      false,
    );
    expect(
      hasPermission(PlatformRole.MERCHANT_STAFF, 'applications.decide'),
    ).toBe(true);
  });

  it('gives SUPER_ADMIN the same Phase 3a set as owner', () => {
    expect(hasPermission(PlatformRole.SUPER_ADMIN, 'devices.unbind')).toBe(
      true,
    );
  });

  it('returns empty permissions when role is null', () => {
    expect(permissionsForRole(null)).toEqual([]);
    expect(hasPermission(null, 'devices.enroll')).toBe(false);
  });
});
