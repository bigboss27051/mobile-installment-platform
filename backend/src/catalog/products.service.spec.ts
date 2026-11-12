import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
    },
  };

  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  const service = new ProductsService(prisma as never);

  beforeEach(() => {
    prisma.product.create.mockReset();
    prisma.product.findFirst.mockReset();
    prisma.productVariant.create.mockReset();
  });

  it('rejects create product without tenant context', async () => {
    await expect(
      service.createProduct(
        {
          tenantId: null,
          userId: 'admin-1',
          role: PlatformRole.SUPER_ADMIN,
        },
        { name: 'Phone X', brand: 'Acme' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates product for tenant', async () => {
    prisma.product.create.mockResolvedValue({
      id: 'product-1',
      tenantId: 'tenant-a',
      name: 'Phone X',
      brand: 'Acme',
    });

    await expect(
      service.createProduct(ctx, { name: 'Phone X', brand: 'Acme' }),
    ).resolves.toMatchObject({
      id: 'product-1',
      tenantId: 'tenant-a',
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        name: 'Phone X',
        brand: 'Acme',
      },
    });
  });

  it('rejects create variant when product does not exist in tenant', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.createVariant(ctx, 'missing-product', {
        sku: 'SKU-001',
        color: 'Black',
        storage: '128GB',
        price: '12900.00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects create variant with duplicate tenant sku', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.productVariant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createVariant(ctx, 'product-1', {
        sku: 'SKU-001',
        color: 'Black',
        storage: '128GB',
        price: '12900.00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates variant with decimal price and THB currency', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      tenantId: 'tenant-a',
    });
    prisma.productVariant.create.mockResolvedValue({
      id: 'variant-1',
      tenantId: 'tenant-a',
      productId: 'product-1',
      sku: 'SKU-001',
      currency: 'THB',
    });

    await expect(
      service.createVariant(ctx, 'product-1', {
        sku: 'SKU-001',
        color: 'Black',
        storage: '128GB',
        price: '12900.00',
      }),
    ).resolves.toMatchObject({
      id: 'variant-1',
      tenantId: 'tenant-a',
      currency: 'THB',
    });

    expect(prisma.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        productId: 'product-1',
        sku: 'SKU-001',
        color: 'Black',
        storage: '128GB',
        currency: 'THB',
        price: expect.any(Prisma.Decimal),
      }),
    });
  });
});
