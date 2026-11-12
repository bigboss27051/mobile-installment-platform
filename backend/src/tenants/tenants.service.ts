import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InterestMethod, PlatformRole, Prisma, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTenantWithOwnerInput {
  tenantName: string;
  branchCode: string;
  branchName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenantWithOwner(
    input: CreateTenantWithOwnerInput,
  ): Promise<{ tenantId: string; userId: string; branchId: string }> {
    const passwordHash = await bcrypt.hash(input.ownerPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          status: TenantStatus.ACTIVE,
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          code: input.branchCode,
          name: input.branchName,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail.toLowerCase(),
          passwordHash,
          fullName: input.ownerFullName,
          role: PlatformRole.MERCHANT_OWNER,
        },
      });

      await tx.installmentPlan.createMany({
        data: [
          {
            tenantId: tenant.id,
            code: 'FLAT-6',
            name: 'Flat 6 months',
            interestMethod: InterestMethod.FLAT,
            annualRate: new Prisma.Decimal('12.00'),
            termMonths: 6,
            active: true,
          },
          {
            tenantId: tenant.id,
            code: 'REDUCING-12',
            name: 'Reducing 12 months',
            interestMethod: InterestMethod.REDUCING,
            annualRate: new Prisma.Decimal('18.00'),
            termMonths: 12,
            active: true,
          },
        ],
      });

      return {
        tenantId: tenant.id,
        userId: user.id,
        branchId: branch.id,
      };
    });
  }

  async getTenantByIdForContext(
    tenantId: string,
    ctx: TenantContext,
  ): Promise<{ id: string; name: string }> {
    if (ctx.role !== PlatformRole.SUPER_ADMIN && ctx.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot access this resource.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }
}
