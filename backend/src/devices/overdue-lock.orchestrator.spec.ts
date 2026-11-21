import {
  DesiredPresentation,
  DeviceBindingStatus,
  DeviceCommandStatus,
  DeviceCommandType,
  Prisma,
  ScheduleItemStatus,
} from '@prisma/client';
import { OverdueLockOrchestrator } from './overdue-lock.orchestrator';

describe('OverdueLockOrchestrator', () => {
  const prisma = {
    devicePolicyEvaluationRun: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    deviceContractBinding: { findMany: jest.fn() },
    paymentScheduleItem: { findMany: jest.fn() },
    deviceCommand: { findFirst: jest.fn() },
    deviceAuditEvent: { findFirst: jest.fn() },
  };
  const commands = { enqueue: jest.fn() };
  const orchestrator = new OverdueLockOrchestrator(
    prisma as never,
    commands as never,
  );
  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: 'MERCHANT_OWNER' as const,
  };

  beforeEach(() => jest.resetAllMocks());

  it('replays stored summary for same idempotency key', async () => {
    const summary = {
      evaluatedAt: '2026-11-21T00:00:00.000Z',
      timezone: 'Asia/Bangkok',
      scannedBindings: 0,
      locked: [],
      skipped: [],
      replay: true,
    };
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue({
      summaryJson: summary,
    });
    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab reason',
      'idem-1',
      new Date('2026-11-21T10:00:00+07:00'),
    );
    expect(result.replay).toBe(true);
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues START_LOCK_TASK when binding overdue and not LOCK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-1',
        contractId: 'c1',
        status: DeviceBindingStatus.ACTIVE,
        device: {
          id: 'dev-1',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        dueDate: new Date('2026-11-01'),
        status: ScheduleItemStatus.PENDING,
      },
    ]);
    prisma.deviceCommand.findFirst.mockResolvedValue(null);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    commands.enqueue.mockResolvedValue({ id: 'cmd-lock' });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab overdue',
      'idem-2',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.locked).toEqual([
      expect.objectContaining({
        deviceId: 'dev-1',
        contractId: 'c1',
        commandId: 'cmd-lock',
      }),
    ]);
    expect(commands.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', userId: 'user-1' }),
      'dev-1',
      expect.objectContaining({
        type: DeviceCommandType.START_LOCK_TASK,
        reason: expect.stringContaining('overdue-lock:2026-11-21'),
      }),
    );
    expect(prisma.deviceContractBinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
  });

  it('skips NOT_OVERDUE and ALREADY_LOCK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-ok',
        contractId: 'c-ok',
        device: {
          id: 'dev-ok',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
      {
        deviceId: 'dev-lock',
        contractId: 'c-lock',
        device: {
          id: 'dev-lock',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.LOCK },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany
      .mockResolvedValueOnce([]) // current
      .mockResolvedValueOnce([
        { dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PENDING },
      ]);
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-3',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.skipped.map((s) => s.reason).sort()).toEqual([
      'ALREADY_LOCK',
      'NOT_OVERDUE',
    ]);
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('skips OPEN_START_LOCK_TASK', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-1',
        contractId: 'c1',
        device: {
          id: 'dev-1',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      { dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceCommand.findFirst.mockResolvedValue({
      id: 'open',
      status: DeviceCommandStatus.QUEUED,
    });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-4',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.skipped[0].reason).toBe('OPEN_START_LOCK_TASK');
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('rejects empty reason', async () => {
    await expect(
      orchestrator.evaluateTenant(ctx, '  ', 'idem-x'),
    ).rejects.toThrow(/REASON/);
  });

  it('skips ALREADY_APPLIED_TODAY when audit already contains the day marker', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([
      {
        deviceId: 'dev-1',
        contractId: 'c1',
        device: {
          id: 'dev-1',
          platform: 'ANDROID',
          policyState: { desiredPresentation: DesiredPresentation.NONE },
        },
      },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      { dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceCommand.findFirst.mockResolvedValue(null);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue({ id: 'audit-today' });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-today',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.skipped).toEqual([
      expect.objectContaining({
        deviceId: 'dev-1',
        contractId: 'c1',
        reason: 'ALREADY_APPLIED_TODAY',
      }),
    ]);
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('rejects missing tenant', async () => {
    await expect(
      orchestrator.evaluateTenant(
        { ...ctx, tenantId: null },
        'lab',
        'idem-tenant',
      ),
    ).rejects.toThrow(/TENANT_REQUIRED/);
    expect(prisma.devicePolicyEvaluationRun.findFirst).not.toHaveBeenCalled();
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('rejects blank idempotency key', async () => {
    await expect(
      orchestrator.evaluateTenant(ctx, 'lab', '   '),
    ).rejects.toThrow(/Idempotency-Key/);
    expect(prisma.deviceContractBinding.findMany).not.toHaveBeenCalled();
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('replays the winning summary when create hits a unique race', async () => {
    const stored = {
      evaluatedAt: '2026-11-21T03:00:00.000Z',
      timezone: 'Asia/Bangkok' as const,
      scannedBindings: 1,
      locked: [
        {
          deviceId: 'dev-winner',
          contractId: 'c-winner',
          commandId: 'cmd-winner',
          reason: 'winner | overdue-lock:2026-11-21',
        },
      ],
      skipped: [],
      replay: false,
    };
    prisma.devicePolicyEvaluationRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ summaryJson: stored });
    prisma.deviceContractBinding.findMany.mockResolvedValue([]);
    prisma.devicePolicyEvaluationRun.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab race',
      'idem-race',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result).toEqual({ ...stored, replay: true });
    expect(commands.enqueue).not.toHaveBeenCalled();
    expect(prisma.devicePolicyEvaluationRun.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', idempotencyKey: 'idem-race' },
      }),
    );
  });
});
