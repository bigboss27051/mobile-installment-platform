import { PlatformRole, UserStatus } from '@prisma/client';
import {
  OverdueLockSystemActorService,
  systemOverdueActorEmail,
} from './overdue-lock-system-actor.service';

describe('OverdueLockSystemActorService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new OverdueLockSystemActorService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('builds a stable internal email per tenant', () => {
    expect(systemOverdueActorEmail('t1')).toBe(
      'system-overdue+t1@mip.internal',
    );
  });

  it('returns existing active system actor', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      role: PlatformRole.MERCHANT_OWNER,
      status: UserStatus.ACTIVE,
    });
    const actor = await service.ensureForTenant('t1');
    expect(actor.id).toBe('u1');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates system actor when missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u-new',
      tenantId: 't1',
      role: PlatformRole.MERCHANT_OWNER,
    });
    const actor = await service.ensureForTenant('t1');
    expect(actor.id).toBe('u-new');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'system-overdue+t1@mip.internal',
          role: PlatformRole.MERCHANT_OWNER,
          fullName: 'System Overdue Lock',
        }),
      }),
    );
  });
});
