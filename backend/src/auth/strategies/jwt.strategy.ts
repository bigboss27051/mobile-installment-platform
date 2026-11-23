import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PlatformRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';
import { mapStaffJwtPayload, StaffJwtPayload } from '../jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: StaffJwtPayload): Promise<TenantContext> {
    const base = mapStaffJwtPayload(payload);
    if (
      base.role === PlatformRole.MERCHANT_OWNER ||
      base.role === PlatformRole.SUPER_ADMIN
    ) {
      return { ...base, branchIds: null };
    }
    if (!base.tenantId || !base.userId) {
      return { ...base, branchIds: [] };
    }
    const rows = await this.prisma.userBranchAssignment.findMany({
      where: { tenantId: base.tenantId, userId: base.userId },
      select: { branchId: true },
    });
    return { ...base, branchIds: rows.map((r) => r.branchId) };
  }
}
