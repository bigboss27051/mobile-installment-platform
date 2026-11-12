import { PlatformRole } from '@prisma/client';

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: PlatformRole | null;
  customerId?: string | null;
  audience?: 'staff' | 'customer';
}
