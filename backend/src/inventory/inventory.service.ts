import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ImeiStatus,
  ImeiUnit,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiveImeiDto } from './dto/receive-imei.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async receive(ctx: TenantContext, input: ReceiveImeiDto): Promise<ImeiUnit> {
    const tenantId = this.requireTenantId(ctx);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const branch = await tx.branch.findFirst({
          where: {
            id: input.branchId,
            tenantId,
          },
          select: { id: true },
        });

        if (!branch) {
          throw new NotFoundException('Branch not found.');
        }

        const variant = await tx.productVariant.findFirst({
          where: {
            id: input.variantId,
            tenantId,
          },
          select: { id: true },
        });

        if (!variant) {
          throw new NotFoundException('Variant not found.');
        }

        const imeiUnit = await tx.imeiUnit.create({
          data: {
            tenantId,
            branchId: input.branchId,
            variantId: input.variantId,
            imei: input.imei,
            status: ImeiStatus.AVAILABLE,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            imeiUnitId: imeiUnit.id,
            type: StockMovementType.RECEIVE,
            fromBranchId: null,
            toBranchId: input.branchId,
            actorUserId: ctx.userId,
            reason: input.reason ?? null,
          },
        });

        return imeiUnit;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('IMEI already exists for this tenant.');
      }
      throw error;
    }
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }
}
