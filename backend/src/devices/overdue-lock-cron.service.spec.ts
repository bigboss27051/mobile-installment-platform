import { OverdueLockCronService } from './overdue-lock-cron.service';

describe('OverdueLockCronService', () => {
  const config = { get: jest.fn() };
  const scheduler = {
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
  };
  const prisma = {
    tenant: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const actors = { ensureForTenant: jest.fn() };
  const orchestrator = { evaluateTenant: jest.fn() };

  const service = new OverdueLockCronService(
    config as never,
    scheduler as never,
    prisma as never,
    actors as never,
    orchestrator as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('logs disabled and does not register when OVERDUE_EVALUATE_CRON unset', () => {
    config.get.mockReturnValue(undefined);
    service.onModuleInit();
    expect(scheduler.addCronJob).not.toHaveBeenCalled();
  });

  it('skips tick when advisory lock not acquired', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ ok: false }]);
    const result = await service.tick(new Date('2026-11-21T10:00:00+07:00'));
    expect(result).toEqual({ ran: false, reason: 'SKIP_LOCK' });
    expect(orchestrator.evaluateTenant).not.toHaveBeenCalled();
  });

  it('evaluates each tenant with system actor when lock acquired', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ ok: true }]) // try lock
      .mockResolvedValueOnce([{ ok: true }]); // unlock
    prisma.tenant.findMany.mockResolvedValue([
      { id: 'tenant-a', devicePolicySettings: null },
    ]);
    actors.ensureForTenant.mockResolvedValue({
      id: 'sys-1',
      tenantId: 'tenant-a',
      role: 'MERCHANT_OWNER',
    });
    orchestrator.evaluateTenant.mockResolvedValue({
      scannedBindings: 1,
      locked: [{ deviceId: 'd1' }],
      skipped: [],
      replay: false,
    });

    const result = await service.tick(new Date('2026-11-21T10:00:00+07:00'));
    expect(result.ran).toBe(true);
    expect(actors.ensureForTenant).toHaveBeenCalledWith('tenant-a');
    expect(orchestrator.evaluateTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        userId: 'sys-1',
      }),
      'cron overdue-evaluate',
      expect.stringMatching(/^cron:tenant-a:2026-11-21:/),
      expect.any(Date),
    );
  });

  it('skips tenants with autoEvaluateCronEnabled false', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ ok: true }]);
    prisma.tenant.findMany.mockResolvedValue([
      {
        id: 'tenant-off',
        devicePolicySettings: { autoEvaluateCronEnabled: false },
      },
      {
        id: 'tenant-on',
        devicePolicySettings: { autoEvaluateCronEnabled: true },
      },
    ]);
    actors.ensureForTenant.mockResolvedValue({
      id: 'sys-2',
      tenantId: 'tenant-on',
      role: 'MERCHANT_OWNER',
    });
    orchestrator.evaluateTenant.mockResolvedValue({
      scannedBindings: 0,
      locked: [],
      skipped: [],
      replay: false,
    });

    await service.tick(new Date('2026-11-21T10:00:00+07:00'));
    expect(orchestrator.evaluateTenant).toHaveBeenCalledTimes(1);
    expect(orchestrator.evaluateTenant).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-on' }),
      expect.any(String),
      expect.any(String),
      expect.any(Date),
    );
  });
});
