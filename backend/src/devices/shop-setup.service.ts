import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { hasPermission } from '../common/authz/permissions';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import {
  isShopSetupReady,
  parseShopSetupInput,
  ShopSetupInput,
  ShopSetupPublic,
} from './shop-setup';

@Injectable()
export class ShopSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async get(ctx: TenantContext): Promise<ShopSetupPublic | null> {
    this.requireEnroll(ctx);
    const tenantId = this.requireTenant(ctx);
    const row = await this.prisma.tenantShopSetup.findUnique({
      where: { tenantId },
    });
    return row ? this.toPublic(row) : null;
  }

  async put(ctx: TenantContext, input: ShopSetupInput): Promise<ShopSetupPublic> {
    this.requireEnroll(ctx);
    const tenantId = this.requireTenant(ctx);
    const parsed = parseShopSetupInput(input);
    if (!parsed.ok) {
      throw new BadRequestException('SHOP_SETUP_INVALID');
    }
    const ready = isShopSetupReady(parsed.value);
    const row = await this.prisma.tenantShopSetup.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...parsed.value,
        completedAt: ready ? new Date() : null,
        completedByUserId: ready ? ctx.userId : null,
      },
      update: {
        ...parsed.value,
        completedAt: ready ? new Date() : null,
        completedByUserId: ready ? ctx.userId : null,
      },
    });
    return this.toPublic(row);
  }

  /** Android enrollment gate. Missing or incomplete row is not ready. */
  async isReady(tenantId: string): Promise<boolean> {
    const row = await this.prisma.tenantShopSetup.findUnique({
      where: { tenantId },
    });
    if (!row) return false;
    return isShopSetupReady(row);
  }

  private toPublic(row: ShopSetupInput & { completedAt: Date | null }): ShopSetupPublic {
    return {
      dpcAttested: row.dpcAttested,
      googleAccountReady: row.googleAccountReady,
      wipeNeedsOnDeviceUnlock: row.wipeNeedsOnDeviceUnlock,
      noRemoteFrpBypass: row.noRemoteFrpBypass,
      ready: isShopSetupReady(row),
      completedAt: row.completedAt,
    };
  }

  private requireEnroll(ctx: TenantContext) {
    if (!hasPermission(ctx.role, 'devices.enroll')) {
      throw new ForbiddenException('PERMISSION_DENIED');
    }
  }

  private requireTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    return ctx.tenantId;
  }
}
