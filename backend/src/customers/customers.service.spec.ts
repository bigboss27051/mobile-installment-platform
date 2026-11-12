import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { NationalIdCrypto } from '../common/crypto/national-id.crypto';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const prisma = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const nationalIdCrypto = new NationalIdCrypto(Buffer.alloc(32, 9).toString('base64'));
  const service = new CustomersService(prisma as never, nationalIdCrypto);

  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  const noTenantCtx = {
    tenantId: null,
    userId: 'admin-1',
    role: PlatformRole.SUPER_ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create without tenant context', async () => {
    await expect(
      service.create(noTenantCtx, {
        fullName: 'Alice',
        phone: '0812345678',
        nationalId: '1234567890123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores encrypted/hash national ID and last4 on create', async () => {
    prisma.customer.create.mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-a',
      fullName: 'Alice',
      phone: '0812345678',
      nationalIdEncrypted: 'encrypted',
      nationalIdHash: 'hash',
      nationalIdLast4: '0123',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(ctx, {
      fullName: 'Alice',
      phone: '0812345678',
      nationalId: '1234567890123',
    });

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        fullName: 'Alice',
        phone: '0812345678',
        nationalIdLast4: '0123',
      }),
    });

    const createArg = prisma.customer.create.mock.calls[0][0].data as {
      nationalIdEncrypted: string;
      nationalIdHash: string;
    };
    expect(createArg.nationalIdEncrypted).not.toBe('1234567890123');
    expect(createArg.nationalIdHash).not.toBe('1234567890123');
  });

  it('maps duplicate phone unique violation to ConflictException', async () => {
    prisma.customer.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(ctx, {
        fullName: 'Alice',
        phone: '0812345678',
        nationalId: '1234567890123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('masks national ID in list response', async () => {
    prisma.customer.findMany.mockResolvedValue([
      {
        id: 'customer-1',
        tenantId: 'tenant-a',
        fullName: 'Alice',
        phone: '0812345678',
        nationalIdLast4: '0123',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(service.list(ctx)).resolves.toEqual([
      expect.objectContaining({
        id: 'customer-1',
        nationalIdMasked: '****0123',
      }),
    ]);
  });

  it('gets customer by id scoped to tenant and masks national ID', async () => {
    prisma.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-a',
      fullName: 'Alice',
      phone: '0812345678',
      nationalIdLast4: '0123',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.getById(ctx, 'customer-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'customer-1',
        nationalIdMasked: '****0123',
      }),
    );
  });

  it('throws when customer does not exist in tenant', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);

    await expect(service.getById(ctx, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates customer and remasks national ID when nationalId is updated', async () => {
    prisma.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-a',
      fullName: 'Alice',
      phone: '0812345678',
      nationalIdLast4: '0123',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.customer.update.mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-a',
      fullName: 'Alice Updated',
      phone: '0899999999',
      nationalIdLast4: '1111',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update(ctx, 'customer-1', {
        fullName: 'Alice Updated',
        phone: '0899999999',
        nationalId: '9999999991111',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'customer-1',
        nationalIdMasked: '****1111',
      }),
    );
  });
});
