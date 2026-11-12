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
      findMany: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
      findMany: jest.fn(),
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
    prisma.product.findMany.mockReset();
    prisma.productVariant.create.mockReset();
    prisma.productVariant.findMany.mockReset();
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

  it('lists products for tenant only', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'product-1', tenantId: 'tenant-a', name: 'Phone X', brand: 'Acme' },
    ]);

    await expect(service.listProducts(ctx)).resolves.toEqual([
      { id: 'product-1', tenantId: 'tenant-a', name: 'Phone X', brand: 'Acme' },
    ]);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('gets product by id scoped to tenant', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      tenantId: 'tenant-a',
      name: 'Phone X',
      brand: 'Acme',
    });

    await expect(service.getProductById(ctx, 'product-1')).resolves.toMatchObject({
      id: 'product-1',
      tenantId: 'tenant-a',
    });

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', tenantId: 'tenant-a' },
    });
  });

  it('throws not found when product not in tenant', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(service.getProductById(ctx, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists variants by product scoped to tenant', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.productVariant.findMany.mockResolvedValue([
      { id: 'variant-1', tenantId: 'tenant-a', productId: 'product-1', sku: 'SKU-001' },
    ]);

    await expect(service.listVariants(ctx, 'product-1')).resolves.toEqual([
      { id: 'variant-1', tenantId: 'tenant-a', productId: 'product-1', sku: 'SKU-001' },
    ]);

    expect(prisma.productVariant.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', productId: 'product-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
