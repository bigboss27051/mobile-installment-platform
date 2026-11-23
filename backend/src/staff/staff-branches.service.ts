import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffBranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches(
    ctx: TenantContext,
    userId: string,
  ): Promise<{ branchIds: string[] }> {
    const tenantId = this.requireTenantId(ctx);
    await this.requireTenantStaffUser(tenantId, userId);
    const rows = await this.prisma.userBranchAssignment.findMany({
      where: { tenantId, userId },
      select: { branchId: true },
      orderBy: { createdAt: 'asc' },
    });
    return { branchIds: rows.map((r) => r.branchId) };
  }

  async putBranches(
    ctx: TenantContext,
    userId: string,
    branchIds: string[],
  ): Promise<{ branchIds: string[] }> {
    const tenantId = this.requireTenantId(ctx);
    await this.requireTenantStaffUser(tenantId, userId);

    const unique = [...new Set(branchIds)];
    if (unique.length === 0) {
      throw new BadRequestException('STAFF_BRANCH_REQUIRED');
    }

    const branches = await this.prisma.branch.findMany({
      where: { tenantId, id: { in: unique } },
      select: { id: true },
    });
    if (branches.length !== unique.length) {
      throw new BadRequestException('BRANCH_NOT_IN_TENANT');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userBranchAssignment.deleteMany({
        where: { tenantId, userId },
      });
      await tx.userBranchAssignment.createMany({
        data: unique.map((branchId) => ({
          tenantId,
          userId,
          branchId,
        })),
      });
    });

    return { branchIds: unique };
  }

  private async requireTenantStaffUser(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('Staff user not found.');
    }
    if (user.role !== PlatformRole.MERCHANT_STAFF) {
      throw new BadRequestException('BRANCH_ASSIGNMENT_STAFF_ONLY');
    }
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }
}
