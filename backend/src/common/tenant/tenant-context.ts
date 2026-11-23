import { PlatformRole } from '@prisma/client';

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: PlatformRole | null;
  customerId?: string | null;
  audience?: 'staff' | 'customer';
  /**
   * null = all branches in tenant (OWNER / SUPER_ADMIN).
   * string[] = STAFF assignments (may be empty).
   * undefined = not loaded (legacy tests); treat as unrestricted only for OWNER/SUPER_ADMIN.
   */
  branchIds?: string[] | null;
}
