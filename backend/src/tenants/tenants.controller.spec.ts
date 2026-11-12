import { Test } from '@nestjs/testing';
import { PlatformRole } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

describe('TenantsController', () => {
  it('me returns { data: null } when tenantId is null without calling service', async () => {
    const getTenantByIdForContext = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: { getTenantByIdForContext },
        },
      ],
    }).compile();

    const controller = moduleRef.get(TenantsController);
    const user: TenantContext = {
      tenantId: null,
      userId: 'user-1',
      role: PlatformRole.SUPER_ADMIN,
    };

    await expect(controller.me(user)).resolves.toEqual({ data: null });
    expect(getTenantByIdForContext).not.toHaveBeenCalled();
  });
});
