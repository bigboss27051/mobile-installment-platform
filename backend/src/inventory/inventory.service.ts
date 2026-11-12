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
import { ReserveImeiDto } from './dto/reserve-imei.dto';
import { TransferImeiDto } from './dto/transfer-imei.dto';

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

  async transfer(
    ctx: TenantContext,
    imeiUnitId: string,
    input: TransferImeiDto,
  ): Promise<ImeiUnit> {
    const tenantId = this.requireTenantId(ctx);

    return this.prisma.$transaction(async (tx) => {
      const imeiUnit = await this.getImeiUnitOrThrow(tx, tenantId, imeiUnitId);

      if (imeiUnit.status !== ImeiStatus.AVAILABLE) {
        throw new ConflictException('IMEI unit must be AVAILABLE to transfer.');
      }

      const targetBranch = await tx.branch.findFirst({
        where: {
          id: input.toBranchId,
          tenantId,
        },
        select: { id: true },
      });

      if (!targetBranch) {
        throw new NotFoundException('Destination branch not found.');
      }

      const updated = await tx.imeiUnit.update({
        where: { id: imeiUnit.id },
        data: { branchId: input.toBranchId },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          imeiUnitId: imeiUnit.id,
          type: StockMovementType.TRANSFER,
          fromBranchId: imeiUnit.branchId,
          toBranchId: input.toBranchId,
          actorUserId: ctx.userId,
          reason: input.reason ?? null,
        },
      });

      return updated;
    });
  }

  async reserve(
    ctx: TenantContext,
    imeiUnitId: string,
    input: ReserveImeiDto,
  ): Promise<ImeiUnit> {
    const tenantId = this.requireTenantId(ctx);

    return this.prisma.$transaction(async (tx) => {
      const imeiUnit = await this.getImeiUnitOrThrow(tx, tenantId, imeiUnitId);

      if (imeiUnit.status !== ImeiStatus.AVAILABLE) {
        throw new ConflictException('IMEI unit must be AVAILABLE to reserve.');
      }

      const updated = await tx.imeiUnit.update({
        where: { id: imeiUnit.id },
        data: { status: ImeiStatus.RESERVED },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          imeiUnitId: imeiUnit.id,
          type: StockMovementType.RESERVE,
          fromBranchId: imeiUnit.branchId,
          toBranchId: imeiUnit.branchId,
          actorUserId: ctx.userId,
          reason: input.reason ?? null,
        },
      });

      return updated;
    });
  }

  async release(
    ctx: TenantContext,
    imeiUnitId: string,
    input: ReserveImeiDto,
  ): Promise<ImeiUnit> {
    const tenantId = this.requireTenantId(ctx);

    return this.prisma.$transaction(async (tx) => {
      const imeiUnit = await this.getImeiUnitOrThrow(tx, tenantId, imeiUnitId);

      if (imeiUnit.status !== ImeiStatus.RESERVED) {
        throw new ConflictException('IMEI unit must be RESERVED to release.');
      }

      const updated = await tx.imeiUnit.update({
        where: { id: imeiUnit.id },
        data: { status: ImeiStatus.AVAILABLE },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          imeiUnitId: imeiUnit.id,
          type: StockMovementType.RELEASE,
          fromBranchId: imeiUnit.branchId,
          toBranchId: imeiUnit.branchId,
          actorUserId: ctx.userId,
          reason: input.reason ?? null,
        },
      });

      return updated;
    });
  }

  async markSold(
    ctx: TenantContext,
    imeiUnitId: string,
    input: ReserveImeiDto,
  ): Promise<ImeiUnit> {
    const tenantId = this.requireTenantId(ctx);

    return this.prisma.$transaction(async (tx) => {
      const imeiUnit = await this.getImeiUnitOrThrow(tx, tenantId, imeiUnitId);

      if (imeiUnit.status !== ImeiStatus.RESERVED) {
        throw new ConflictException('IMEI unit must be RESERVED to mark sold.');
      }

      const updated = await tx.imeiUnit.update({
        where: { id: imeiUnit.id },
        data: { status: ImeiStatus.SOLD },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          imeiUnitId: imeiUnit.id,
          type: StockMovementType.SELL,
          fromBranchId: imeiUnit.branchId,
          toBranchId: null,
          actorUserId: ctx.userId,
          reason: input.reason ?? null,
        },
      });

      return updated;
    });
  }

  private async getImeiUnitOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    imeiUnitId: string,
  ): Promise<Pick<ImeiUnit, 'id' | 'branchId' | 'status'>> {
    const imeiUnit = await tx.imeiUnit.findFirst({
      where: {
        id: imeiUnitId,
        tenantId,
      },
      select: {
        id: true,
        branchId: true,
        status: true,
      },
    });

    if (!imeiUnit) {
      throw new NotFoundException('IMEI unit not found.');
    }

    return imeiUnit;
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }
}
