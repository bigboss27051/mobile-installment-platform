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
    deviceAuditEvent: { findFirst: jest.fn(), create: jest.fn() },
    devicePolicyState: { upsert: jest.fn() },
    $transaction: jest.fn(),
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

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
  });

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

  it('applies REMINDER without enqueue when overdue 1–2 days', async () => {
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
      { dueDate: new Date('2026-11-20'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab ladder',
      'idem-rem',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.locked[0]).toEqual(
      expect.objectContaining({
        target: DesiredPresentation.REMINDER,
        commandId: null,
      }),
    );
    expect(commands.enqueue).not.toHaveBeenCalled();
    expect(prisma.devicePolicyState.upsert).toHaveBeenCalled();
  });

  it('enqueues START_LOCK_TASK when overdue ≥7 days and below LOCK', async () => {
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
      { dueDate: new Date('2026-11-14'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    prisma.deviceCommand.findFirst.mockResolvedValue(null);
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
        commandId: 'cmd-lock',
        target: DesiredPresentation.LOCK,
      }),
    ]);
    expect(commands.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', userId: 'user-1' }),
      'dev-1',
      expect.objectContaining({
        type: DeviceCommandType.START_LOCK_TASK,
        reason: expect.stringContaining('overdue-ladder:2026-11-21:LOCK'),
      }),
    );
  });

  it('enqueues START_PACKAGE_SUSPEND for RESTRICT band', async () => {
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
      { dueDate: new Date('2026-11-18'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    prisma.deviceCommand.findFirst.mockResolvedValue(null);
    commands.enqueue.mockResolvedValue({ id: 'cmd-sus' });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-r',
      new Date('2026-11-21T10:00:00+07:00'),
    );

    expect(result.locked[0].target).toBe(DesiredPresentation.RESTRICT);
    expect(commands.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      expect.objectContaining({
        type: DeviceCommandType.START_PACKAGE_SUSPEND,
      }),
    );
  });

  it('skips NOT_OVERDUE and ALREADY_AT_OR_ABOVE', async () => {
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
      .mockResolvedValueOnce([])
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
      'ALREADY_AT_OR_ABOVE',
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
      { dueDate: new Date('2026-11-14'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
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

  it('rejects missing tenant', async () => {
    await expect(
      orchestrator.evaluateTenant(
        { ...ctx, tenantId: null },
        'lab',
        'idem-t',
      ),
    ).rejects.toThrow(/TENANT/);
  });

  it('rejects blank idempotency key', async () => {
    await expect(
      orchestrator.evaluateTenant(ctx, 'lab', '  '),
    ).rejects.toThrow(/Idempotency/);
  });

  it('asserts tenant scoping on binding query', async () => {
    prisma.devicePolicyEvaluationRun.findFirst.mockResolvedValue(null);
    prisma.deviceContractBinding.findMany.mockResolvedValue([]);
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});
    await orchestrator.evaluateTenant(ctx, 'lab', 'idem-scope');
    expect(prisma.deviceContractBinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
  });

  it('skips ALREADY_APPLIED_TODAY for ladder marker', async () => {
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
      { dueDate: new Date('2026-11-14'), status: ScheduleItemStatus.PENDING },
    ]);
    prisma.deviceAuditEvent.findFirst.mockResolvedValue({ id: 'aud-1' });
    prisma.devicePolicyEvaluationRun.create.mockResolvedValue({});

    const result = await orchestrator.evaluateTenant(
      ctx,
      'lab',
      'idem-day',
      new Date('2026-11-21T10:00:00+07:00'),
    );
    expect(result.skipped[0].reason).toBe('ALREADY_APPLIED_TODAY');
  });

  it('replays the winning summary when create hits a unique race', async () => {
    prisma.devicePolicyEvaluationRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        summaryJson: {
          evaluatedAt: 'x',
          timezone: 'Asia/Bangkok',
          scannedBindings: 0,
          locked: [],
          skipped: [],
          replay: false,
        },
      });
    prisma.deviceContractBinding.findMany.mockResolvedValue([]);
    prisma.devicePolicyEvaluationRun.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await orchestrator.evaluateTenant(ctx, 'lab', 'idem-race');
    expect(result.replay).toBe(true);
  });
});
