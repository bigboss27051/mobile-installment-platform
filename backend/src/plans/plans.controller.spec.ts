import { Test } from '@nestjs/testing';
import { InterestMethod, PlatformRole, Prisma } from '@prisma/client';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

describe('PlansController', () => {
  const plans = {
    list: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('serializes annual rate decimals as fixed 2 strings', async () => {
    plans.list.mockResolvedValue([
      {
        id: 'plan-1',
        code: 'FLAT-6',
        name: 'Flat 6 months',
        interestMethod: InterestMethod.FLAT,
        annualRate: new Prisma.Decimal('12.00'),
        termMonths: 6,
        active: true,
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: plans }],
    }).compile();
    const controller = moduleRef.get(PlansController);

    await expect(
      controller.list({
        tenantId: 'tenant-a',
        userId: 'user-1',
        role: PlatformRole.MERCHANT_OWNER,
      }),
    ).resolves.toEqual({
      data: [
        {
          id: 'plan-1',
          code: 'FLAT-6',
          name: 'Flat 6 months',
          interestMethod: InterestMethod.FLAT,
          annualRate: '12.00',
          termMonths: 6,
          active: true,
        },
      ],
    });
  });
});
