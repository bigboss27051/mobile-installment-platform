import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ImeiStatus,
  PlatformRole,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import { ReserveImeiDto } from './dto/reserve-imei.dto';
import { TransferImeiDto } from './dto/transfer-imei.dto';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const tx = {
    branch: { findFirst: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    imeiUnit: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    stockMovement: { create: jest.fn() },
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };

  const service = new InventoryService(prisma as never);
  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => jest.clearAllMocks());

  const noTenantCtx = {
    tenantId: null,
    userId: 'u',
    role: PlatformRole.SUPER_ADMIN,
  };

  it('rejects without tenant', async () => {
    await expect(
      service.receive(noTenantCtx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    [
      'transfer',
      () =>
        service.transfer(noTenantCtx, 'u1', {
          toBranchId: 'b2',
          reason: 'move',
        }),
    ],
    [
      'reserve',
      () => service.reserve(noTenantCtx, 'u1', { reason: 'hold' }),
    ],
    [
      'release',
      () => service.release(noTenantCtx, 'u1', { reason: 'cancel' }),
    ],
    [
      'markSold',
      () => service.markSold(noTenantCtx, 'u1', { reason: 'paid' }),
    ],
  ])('rejects %s without tenant context', async (_label, call) => {
    await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when branch does not exist in tenant', async () => {
    tx.branch.findFirst.mockResolvedValue(null);

    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when variant does not exist in tenant', async () => {
    tx.branch.findFirst.mockResolvedValue({ id: 'b1', tenantId: 'tenant-a' });
    tx.productVariant.findFirst.mockResolvedValue(null);

    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('receives IMEI into branch with RECEIVE movement', async () => {
    tx.branch.findFirst.mockResolvedValue({ id: 'b1', tenantId: 'tenant-a' });
    tx.productVariant.findFirst.mockResolvedValue({
      id: 'v1',
      tenantId: 'tenant-a',
    });
    tx.imeiUnit.create.mockResolvedValue({
      id: 'u1',
      imei: '356938035643809',
      status: ImeiStatus.AVAILABLE,
      branchId: 'b1',
      tenantId: 'tenant-a',
      variantId: 'v1',
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm1' });

    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).resolves.toMatchObject({ id: 'u1', status: ImeiStatus.AVAILABLE });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.RECEIVE,
          toBranchId: 'b1',
          actorUserId: 'user-1',
        }),
      }),
    );
  });

  it('maps unique violation to ConflictException', async () => {
    tx.branch.findFirst.mockResolvedValue({ id: 'b1', tenantId: 'tenant-a' });
    tx.productVariant.findFirst.mockResolvedValue({
      id: 'v1',
      tenantId: 'tenant-a',
    });
    tx.imeiUnit.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(
      service.receive(ctx, {
        branchId: 'b1',
        variantId: 'v1',
        imei: '356938035643809',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects reserve when not AVAILABLE', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.RESERVED,
    });

    await expect(
      service.reserve(ctx, 'u1', {
        reason: 'hold for order #1001',
      } satisfies ReserveImeiDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reserves AVAILABLE unit', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });
    tx.imeiUnit.update.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.RESERVED,
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm2' });

    await expect(
      service.reserve(ctx, 'u1', {
        reason: 'reserve for walk-in',
      } satisfies ReserveImeiDto),
    ).resolves.toMatchObject({ id: 'u1', status: ImeiStatus.RESERVED });

    expect(tx.imeiUnit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1', status: ImeiStatus.AVAILABLE },
        data: { status: ImeiStatus.RESERVED },
      }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.RESERVE,
          fromBranchId: 'b1',
          toBranchId: 'b1',
          actorUserId: 'user-1',
        }),
      }),
    );
  });

  it('transfers AVAILABLE unit to another branch', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });
    tx.branch.findFirst.mockResolvedValue({ id: 'b2', tenantId: 'tenant-a' });
    tx.imeiUnit.update.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b2',
      status: ImeiStatus.AVAILABLE,
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm3' });

    await expect(
      service.transfer(ctx, 'u1', {
        toBranchId: 'b2',
        reason: 'redistribute stock',
      } satisfies TransferImeiDto),
    ).resolves.toMatchObject({ id: 'u1', branchId: 'b2' });

    expect(tx.imeiUnit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1', status: ImeiStatus.AVAILABLE },
        data: { branchId: 'b2' },
      }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.TRANSFER,
          fromBranchId: 'b1',
          toBranchId: 'b2',
          actorUserId: 'user-1',
        }),
      }),
    );
  });

  it('releases RESERVED unit back to AVAILABLE', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.RESERVED,
    });
    tx.imeiUnit.update.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm4' });

    await expect(
      service.release(ctx, 'u1', { reason: 'customer no-show' }),
    ).resolves.toMatchObject({ id: 'u1', status: ImeiStatus.AVAILABLE });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.RELEASE,
          fromBranchId: 'b1',
          toBranchId: 'b1',
        }),
      }),
    );
  });

  it('rejects reserve when IMEI unit is missing or wrong tenant', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue(null);

    await expect(
      service.reserve(ctx, 'missing-u1', { reason: 'hold' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.imeiUnit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'missing-u1', tenantId: 'tenant-a' },
      }),
    );
  });

  it('rejects transfer when IMEI unit is missing or wrong tenant', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue(null);

    await expect(
      service.transfer(ctx, 'missing-u1', {
        toBranchId: 'b2',
        reason: 'move',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects transfer when unit is not AVAILABLE', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.RESERVED,
    });

    await expect(
      service.transfer(ctx, 'u1', { toBranchId: 'b2', reason: 'move' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects transfer when destination branch missing in tenant', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });
    tx.branch.findFirst.mockResolvedValue(null);

    await expect(
      service.transfer(ctx, 'u1', { toBranchId: 'b-missing', reason: 'move' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects release when unit is not RESERVED', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });

    await expect(
      service.release(ctx, 'u1', { reason: 'cancel hold' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects markSold when unit is not RESERVED', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.AVAILABLE,
    });

    await expect(
      service.markSold(ctx, 'u1', { reason: 'paid' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('marks RESERVED unit as SOLD', async () => {
    tx.imeiUnit.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.RESERVED,
    });
    tx.imeiUnit.update.mockResolvedValue({
      id: 'u1',
      tenantId: 'tenant-a',
      branchId: 'b1',
      status: ImeiStatus.SOLD,
    });
    tx.stockMovement.create.mockResolvedValue({ id: 'm5' });

    await expect(
      service.markSold(ctx, 'u1', { reason: 'invoice paid' }),
    ).resolves.toMatchObject({ id: 'u1', status: ImeiStatus.SOLD });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.SELL,
          fromBranchId: 'b1',
          toBranchId: null,
        }),
      }),
    );
  });
});
