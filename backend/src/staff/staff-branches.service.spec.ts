import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { StaffBranchesService } from './staff-branches.service';

describe('StaffBranchesService', () => {
  const prisma: {
    user: { findFirst: jest.Mock };
    branch: { findMany: jest.Mock };
    userBranchAssignment: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    user: { findFirst: jest.fn() },
    branch: { findMany: jest.fn() },
    userBranchAssignment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (fn: (t: typeof prisma) => unknown) => fn(prisma),
  );

  const service = new StaffBranchesService(prisma as never);
  const ownerCtx = {
    tenantId: 'tenant-a',
    userId: 'owner-1',
    role: PlatformRole.MERCHANT_OWNER,
    branchIds: null,
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects without tenant', async () => {
    await expect(
      service.listBranches(
        {
          tenantId: null,
          userId: 'u',
          role: PlatformRole.SUPER_ADMIN,
        },
        'staff-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing staff user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.listBranches(ownerCtx, 'staff-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects branch assignment for OWNER user', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'owner-2',
      role: PlatformRole.MERCHANT_OWNER,
    });
    await expect(
      service.putBranches(ownerCtx, 'owner-2', ['b1']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists assigned branch ids', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      role: PlatformRole.MERCHANT_STAFF,
    });
    prisma.userBranchAssignment.findMany.mockResolvedValue([
      { branchId: 'b1' },
      { branchId: 'b2' },
    ]);

    await expect(service.listBranches(ownerCtx, 'staff-1')).resolves.toEqual({
      branchIds: ['b1', 'b2'],
    });
  });

  it('rejects empty branch list', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      role: PlatformRole.MERCHANT_STAFF,
    });
    await expect(
      service.putBranches(ownerCtx, 'staff-1', []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects branches outside tenant', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      role: PlatformRole.MERCHANT_STAFF,
    });
    prisma.branch.findMany.mockResolvedValue([{ id: 'b1' }]);
    await expect(
      service.putBranches(ownerCtx, 'staff-1', ['b1', 'b2']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces staff branch assignments', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      role: PlatformRole.MERCHANT_STAFF,
    });
    prisma.branch.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
    prisma.userBranchAssignment.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userBranchAssignment.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.putBranches(ownerCtx, 'staff-1', ['b1', 'b2', 'b1']),
    ).resolves.toEqual({ branchIds: ['b1', 'b2'] });

    expect(prisma.userBranchAssignment.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', userId: 'staff-1' },
    });
    expect(prisma.userBranchAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { tenantId: 'tenant-a', userId: 'staff-1', branchId: 'b1' },
        { tenantId: 'tenant-a', userId: 'staff-1', branchId: 'b2' },
      ],
    });
  });
});
