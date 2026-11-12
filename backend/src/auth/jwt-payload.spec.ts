import { UnauthorizedException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { mapCustomerJwtPayload, mapStaffJwtPayload } from './jwt-payload';

describe('jwt payload mapping', () => {
  it('maps staff tokens including legacy payloads without typ', () => {
    expect(
      mapStaffJwtPayload({
        sub: 'user-1',
        tenantId: 'tenant-a',
        role: PlatformRole.MERCHANT_STAFF,
      }),
    ).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-a',
      role: PlatformRole.MERCHANT_STAFF,
      customerId: null,
      audience: 'staff',
    });
  });

  it('rejects customer tokens on the staff mapper', () => {
    expect(() =>
      mapStaffJwtPayload({
        sub: 'cust-1',
        tenantId: 'tenant-a',
        role: PlatformRole.MERCHANT_STAFF,
        typ: 'customer',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('maps customer tokens', () => {
    expect(
      mapCustomerJwtPayload({
        sub: 'cust-1',
        tenantId: 'tenant-a',
        typ: 'customer',
      }),
    ).toEqual({
      userId: '',
      tenantId: 'tenant-a',
      role: null,
      customerId: 'cust-1',
      audience: 'customer',
    });
  });
});
