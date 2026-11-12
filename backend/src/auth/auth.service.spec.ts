import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('rejects invalid password', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.com',
          passwordHash: await bcrypt.hash('correct-password', 4),
          tenantId: 't1',
          role: 'MERCHANT_OWNER',
          status: 'ACTIVE',
          fullName: 'A',
        }),
      },
    };
    const jwt = { signAsync: jest.fn() };
    const tenants = {};
    const config = {
      get: (key: string) =>
        key.includes('TTL') ? '15m' : 'dev-access-secret-change-me',
    };

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
});
