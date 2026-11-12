import { ForbiddenException, Injectable } from '@nestjs/common';
import { InstallmentPlan } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: TenantContext): Promise<InstallmentPlan[]> {
    const tenantId = this.requireTenantId(ctx);
    return this.prisma.installmentPlan.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }
}
