import { Test } from '@nestjs/testing';
import { ImeiStatus, PlatformRole, Prisma } from '@prisma/client';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  const inventory = {
    receive: jest.fn(),
    listImeiUnits: jest.fn(),
    getImeiUnitById: jest.fn(),
    transfer: jest.fn(),
    reserve: jest.fn(),
    release: jest.fn(),
    listMovements: jest.fn(),
  };

  const user = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => jest.clearAllMocks());

  it('serializes Decimal variant price in IMEI list', async () => {
    inventory.listImeiUnits.mockResolvedValue([
      {
        id: 'u1',
        imei: '356938035643809',
        status: ImeiStatus.AVAILABLE,
        variant: {
          id: 'variant-1',
          price: new Prisma.Decimal('12900.00'),
          currency: 'THB',
        },
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: inventory }],
    }).compile();
    const controller = moduleRef.get(InventoryController);

    await expect(controller.listImeiUnits({}, user)).resolves.toEqual({
      data: [
        {
          id: 'u1',
          imei: '356938035643809',
          status: ImeiStatus.AVAILABLE,
          variant: {
            id: 'variant-1',
            price: '12900.00',
            currency: 'THB',
          },
        },
      ],
    });
  });
});
