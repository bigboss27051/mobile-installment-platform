import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PlatformRole, UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tenants: TenantsService,
    private readonly config: ConfigService,
  ) {}

  async registerOwner(dto: RegisterOwnerDto) {
    const created = await this.tenants.createTenantWithOwner({
      tenantName: dto.tenantName,
      branchCode: dto.branchCode,
      branchName: dto.branchName,
      ownerEmail: dto.ownerEmail,
      ownerPassword: dto.ownerPassword,
      ownerFullName: dto.ownerFullName,
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: created.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        fullName: true,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        fullName: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const stored = await tx.refreshToken.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: {
          user: {
            select: {
              id: true,
              tenantId: true,
              role: true,
              email: true,
              fullName: true,
              status: true,
            },
          },
        },
      });

      if (!stored || stored.user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const revokeResult = await tx.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revokeResult.count !== 1) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      return this.issueTokens(stored.user, tx);
    });
  }

  private async issueTokens(user: {
    id: string;
    tenantId: string | null;
    role: PlatformRole;
    email: string;
    fullName: string;
  }, tx?: Prisma.TransactionClient) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as never,
    });

    const refreshToken = randomUUID() + randomUUID();
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const expiresAt = new Date(Date.now() + parseTtlMs(refreshTtl));

    const refreshTokenRepo = tx?.refreshToken ?? this.prisma.refreshToken;
    await refreshTokenRepo.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tenantId: user.tenantId,
          role: user.role,
        },
      },
    };
  }
}

function parseTtlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : 86_400_000;

  return value * multiplier;
}
