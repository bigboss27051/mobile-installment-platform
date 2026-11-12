import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerStatus, TenantStatus } from '@prisma/client';
import { CustomerAuthService } from './customer-auth.service';
import { hashCustomerOtp } from './customer-otp';

describe('CustomerAuthService', () => {
  const secret = 'dev-access-secret-change-me';
  const now = new Date('2026-11-12T12:00:00.000Z');

  function createService() {
    const prisma = {
      tenant: { findUnique: jest.fn() },
      customer: { findFirst: jest.fn() },
      customerOtpChallenge: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('customer-token') };
    const config = {
      getOrThrow: jest.fn().mockReturnValue(secret),
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'CUSTOMER_OTP_SANDBOX_CODE') return '123456';
        if (key === 'JWT_ACCESS_TTL') return '15m';
        return fallback;
      }),
    };
    const service = new CustomerAuthService(
      prisma as never,
      jwt as never,
      config as never,
    );
    jest.spyOn(service, 'now').mockReturnValue(now);
    return { service, prisma, jwt };
  }

  const tenant = {
    id: 'tenant-a',
    slug: 'shop-a',
    status: TenantStatus.ACTIVE,
  };
  const customer = {
    id: 'cust-1',
    tenantId: 'tenant-a',
    phone: '0811111111',
    fullName: 'Somchai',
    status: CustomerStatus.ACTIVE,
  };

  it('rejects OTP request when tenant slug is unknown', async () => {
    const { service, prisma } = createService();
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(
      service.requestOtp({ tenantSlug: 'missing', phone: '0811111111' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects OTP request when customer phone is unknown in tenant', async () => {
    const { service, prisma } = createService();
    prisma.tenant.findUnique.mockResolvedValue(tenant);
    prisma.customer.findFirst.mockResolvedValue(null);

    await expect(
      service.requestOtp({ tenantSlug: 'shop-a', phone: '0811111111' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rate-limits OTP requests after five in 15 minutes', async () => {
    const { service, prisma } = createService();
    prisma.tenant.findUnique.mockResolvedValue(tenant);
    prisma.customer.findFirst.mockResolvedValue(customer);
    prisma.customerOtpChallenge.count.mockResolvedValue(5);

    await expect(
      service.requestOtp({ tenantSlug: 'shop-a', phone: '0811111111' }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('stores a hashed sandbox OTP on request', async () => {
    const { service, prisma } = createService();
    prisma.tenant.findUnique.mockResolvedValue(tenant);
    prisma.customer.findFirst.mockResolvedValue(customer);
    prisma.customerOtpChallenge.count.mockResolvedValue(0);
    prisma.customerOtpChallenge.create.mockResolvedValue({
      expiresAt: new Date('2026-11-12T12:10:00.000Z'),
    });

    const result = await service.requestOtp({
      tenantSlug: 'shop-a',
      phone: '0811111111',
    });

    expect(result.expiresAt.toISOString()).toBe('2026-11-12T12:10:00.000Z');
    expect(prisma.customerOtpChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        customerId: 'cust-1',
        phone: '0811111111',
        codeHash: hashCustomerOtp({
          secret,
          tenantId: 'tenant-a',
          phone: '0811111111',
          code: '123456',
        }),
      }),
    });
  });

  it('rejects verify with a wrong code', async () => {
    const { service, prisma } = createService();
    prisma.tenant.findUnique.mockResolvedValue(tenant);
    prisma.customer.findFirst.mockResolvedValue(customer);
    prisma.customerOtpChallenge.findFirst.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashCustomerOtp({
        secret,
        tenantId: 'tenant-a',
        phone: '0811111111',
        code: '123456',
      }),
    });

    await expect(
      service.verifyOtp({
        tenantSlug: 'shop-a',
        phone: '0811111111',
        code: '000000',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a customer JWT on valid sandbox OTP', async () => {
    const { service, prisma, jwt } = createService();
    prisma.tenant.findUnique.mockResolvedValue(tenant);
    prisma.customer.findFirst.mockResolvedValue(customer);
    prisma.customerOtpChallenge.findFirst.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashCustomerOtp({
        secret,
        tenantId: 'tenant-a',
        phone: '0811111111',
        code: '123456',
      }),
    });
    prisma.customerOtpChallenge.update.mockResolvedValue({});

    const result = await service.verifyOtp({
      tenantSlug: 'shop-a',
      phone: '0811111111',
      code: '123456',
    });

    expect(prisma.customerOtpChallenge.update).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: { consumedAt: now },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'cust-1',
        tenantId: 'tenant-a',
        typ: 'customer',
      }),
      expect.any(Object),
    );
    expect(result.data.accessToken).toBe('customer-token');
    expect(result.data.customer.id).toBe('cust-1');
  });
});
