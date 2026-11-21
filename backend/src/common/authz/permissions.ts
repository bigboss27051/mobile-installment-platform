import { PlatformRole } from '@prisma/client';

export const PERMISSIONS = [
  'applications.decide',
  'contracts.activate',
  'devices.enroll',
  'devices.activate',
  'devices.bind',
  'devices.unbind',
  'devices.command',
  'devices.location.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const OWNER_PERMS: Permission[] = [...PERMISSIONS];

const STAFF_PERMS: Permission[] = PERMISSIONS.filter(
  (p) => p !== 'devices.unbind',
);

export function permissionsForRole(
  role: PlatformRole | null | undefined,
): Permission[] {
  switch (role) {
    case PlatformRole.MERCHANT_OWNER:
    case PlatformRole.SUPER_ADMIN:
      return [...OWNER_PERMS];
    case PlatformRole.MERCHANT_STAFF:
      return [...STAFF_PERMS];
    default:
      return [];
  }
}

export function hasPermission(
  role: PlatformRole | null | undefined,
  permission: Permission,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasAllPermissions(
  role: PlatformRole | null | undefined,
  required: Permission[],
): boolean {
  const granted = new Set(permissionsForRole(role));
  return required.every((p) => granted.has(p));
}
