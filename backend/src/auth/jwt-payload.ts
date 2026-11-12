import { UnauthorizedException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';

export type StaffJwtPayload = {
  sub: string;
  tenantId: string | null;
  role: PlatformRole;
  typ?: 'staff' | 'customer';
};

export type CustomerJwtPayload = {
  sub: string;
  tenantId: string;
  typ: 'customer';
};

export function mapStaffJwtPayload(payload: StaffJwtPayload): TenantContext {
  if (payload.typ === 'customer') {
    throw new UnauthorizedException('Customer token is not allowed here.');
  }
  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
    customerId: null,
    audience: 'staff',
  };
}

export function mapCustomerJwtPayload(
  payload: CustomerJwtPayload,
): TenantContext {
  if (payload.typ !== 'customer' || !payload.tenantId || !payload.sub) {
    throw new UnauthorizedException('Invalid customer token.');
  }
  return {
    userId: '',
    tenantId: payload.tenantId,
    role: null,
    customerId: payload.sub,
    audience: 'customer',
  };
}
