import { PlatformRole } from '@prisma/client';

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: PlatformRole;
}
