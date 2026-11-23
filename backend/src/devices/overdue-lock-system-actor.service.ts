import { Injectable } from '@nestjs/common';
import { PlatformRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Stable email pattern — not for interactive login. */
export function systemOverdueActorEmail(tenantId: string): string {
  return `system-overdue+${tenantId}@mip.internal`;
}

@Injectable()
export class OverdueLockSystemActorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures a dedicated MERCHANT_OWNER per tenant for cron/staff-less evaluate.
   * Password is random and unused; login must not rely on this account.
   */
  async ensureForTenant(tenantId: string): Promise<{
    id: string;
    tenantId: string;
    role: PlatformRole;
  }> {
    const email = systemOverdueActorEmail(tenantId);
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });
    if (existing) {
      if (existing.status !== UserStatus.ACTIVE) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { status: UserStatus.ACTIVE },
        });
      }
      return {
        id: existing.id,
        tenantId,
        role: existing.role,
      };
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    const created = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        fullName: 'System Overdue Lock',
        role: PlatformRole.MERCHANT_OWNER,
        status: UserStatus.ACTIVE,
      },
    });
    return {
      id: created.id,
      tenantId,
      role: created.role,
    };
  }
}
