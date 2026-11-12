import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const activeUser = {
    id: 'u1',
    email: 'a@b.com',
    passwordHash: '',
    tenantId: 't1',
    role: 'MERCHANT_OWNER',
    status: UserStatus.ACTIVE,
    fullName: 'A',
  };

  function createConfig() {
    return {
      getOrThrow: jest.fn().mockReturnValue('dev-access-secret-change-me'),
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return '7d';
        return defaultValue ?? 'unused';
      }),
    };
  }

  it('rejects invalid password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          passwordHash,
        }),
      },
      refreshToken: { create: jest.fn() },
    };
    const jwt = { signAsync: jest.fn() };
    const tenants = {};
    const config = createConfig();

    const service = new AuthService(
      prisma as never,
      jwt as never,
      tenants as never,
      config as never,
    );

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login for inactive user', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          status: UserStatus.DISABLED,
        }),
      },
      refreshToken: { create: jest.fn() },
    };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn() } as never,
      {} as never,
      createConfig() as never,
    );

    await expect(
      service.login({ email: 'a@b.com', password: 'correct-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates refresh token on valid refresh', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'rt-1',
      user: {
        id: activeUser.id,
        email: activeUser.email,
        fullName: activeUser.fullName,
        tenantId: activeUser.tenantId,
        role: activeUser.role,
        status: UserStatus.ACTIVE,
      },
    });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({});
    const tx = { refreshToken: { findFirst, updateMany, create } };
    const prisma = {
      $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
      refreshToken: { create: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      {} as never,
      createConfig() as never,
    );

    const result = await service.refresh('refresh-token');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tokenHash: expect.any(String),
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      }),
      data: { revokedAt: expect.any(Date) },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: activeUser.id,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(result.data.accessToken).toBe('access-token');
    expect(typeof result.data.refreshToken).toBe('string');
    expect(result.data.refreshToken.length).toBeGreaterThan(0);
  });

  it.each(['unknown', 'revoked', 'expired'])(
    'rejects %s refresh token',
    async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const tx = {
        refreshToken: {
          findFirst,
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };
      const prisma = {
        $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
        refreshToken: { create: jest.fn() },
        user: { findUnique: jest.fn() },
      };
      const service = new AuthService(
        prisma as never,
        { signAsync: jest.fn() } as never,
        {} as never,
        createConfig() as never,
      );

      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
