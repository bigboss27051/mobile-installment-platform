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
import { InventoryService } from './inventory.service';

describe('InventoryService.receive', () => {
  const tx = {
    branch: { findFirst: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    imeiUnit: { create: jest.fn() },
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

  it('rejects without tenant', async () => {
    await expect(
      service.receive(
        { tenantId: null, userId: 'u', role: PlatformRole.SUPER_ADMIN },
        { branchId: 'b1', variantId: 'v1', imei: '356938035643809' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
});
