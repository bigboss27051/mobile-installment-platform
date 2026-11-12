import { Test } from '@nestjs/testing';
import { PlatformRole, Prisma } from '@prisma/client';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  const products = {
    createProduct: jest.fn(),
    listProducts: jest.fn(),
    getProductById: jest.fn(),
    createVariant: jest.fn(),
    listVariants: jest.fn(),
  };

  const user = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => jest.clearAllMocks());

  it('serializes decimal variant prices as string', async () => {
    products.listVariants.mockResolvedValue([
      {
        id: 'variant-1',
        sku: 'SKU-001',
        price: new Prisma.Decimal('12900.00'),
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: products }],
    }).compile();
    const controller = moduleRef.get(ProductsController);

    await expect(controller.listVariants('product-1', user)).resolves.toEqual({
      data: [{ id: 'variant-1', sku: 'SKU-001', price: '12900.00' }],
    });
  });
});
