import { DesiredPresentation, DeviceBindingStatus, Prisma } from '@prisma/client';
import { PaymentUnlockOrchestrator } from './payment-unlock.orchestrator';

describe('PaymentUnlockOrchestrator', () => {
  const prisma = {
    paymentScheduleItem: { findMany: jest.fn() },
    deviceContractBinding: { findFirst: jest.fn() },
    deviceAuditEvent: { findFirst: jest.fn() },
  };
  const commands = {
    enqueue: jest.fn(),
  };
  const lockApprovals = {
    cancelPendingForDevice: jest.fn().mockResolvedValue(0),
  };
  const orchestrator = new PaymentUnlockOrchestrator(
    prisma as never,
    commands as never,
    lockApprovals as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    lockApprovals.cancelPendingForDevice.mockResolvedValue(0);
  });

  it('no-ops when outstanding remains', async () => {
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        totalDue: new Prisma.Decimal('100.00'),
        amountPaid: new Prisma.Decimal('0.00'),
      },
    ]);

    const result = await orchestrator.onVerifiedPayment({
      tenantId: 'tenant-a',
      contractId: 'c1',
      paymentTransactionId: 'tx-1',
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('OUTSTANDING_REMAINS');
    expect(commands.enqueue).not.toHaveBeenCalled();
  });

  it('queues STOP_LOCK_TASK when paid off and desired LOCK', async () => {
    prisma.paymentScheduleItem.findMany.mockResolvedValue([]);
    prisma.deviceContractBinding.findFirst.mockResolvedValue({
      deviceId: 'dev-1',
      actorUserId: 'user-1',
      status: DeviceBindingStatus.ACTIVE,
      device: {
        id: 'dev-1',
        platform: 'ANDROID',
        policyState: { desiredPresentation: DesiredPresentation.LOCK },
      },
    });
    prisma.deviceAuditEvent.findFirst.mockResolvedValue(null);
    commands.enqueue.mockResolvedValue({ id: 'cmd-unlock' });

    const result = await orchestrator.onVerifiedPayment({
      tenantId: 'tenant-a',
      contractId: 'c1',
      paymentTransactionId: 'tx-1',
    });

    expect(result.applied).toBe(true);
    expect(result.commandIds).toEqual(['cmd-unlock']);
    expect(commands.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-a' }),
      'dev-1',
      expect.objectContaining({
        type: 'STOP_LOCK_TASK',
        reason: expect.stringContaining('pay:tx-1'),
      }),
    );
  });

  it('is idempotent when audit marker already exists', async () => {
    prisma.paymentScheduleItem.findMany.mockResolvedValue([]);
    prisma.deviceContractBinding.findFirst.mockResolvedValue({
      deviceId: 'dev-1',
      actorUserId: 'user-1',
      device: {
        id: 'dev-1',
        platform: 'ANDROID',
        policyState: { desiredPresentation: DesiredPresentation.LOCK },
      },
    });
    prisma.deviceAuditEvent.findFirst.mockResolvedValue({ id: 'audit-1' });

    const result = await orchestrator.onVerifiedPayment({
      tenantId: 'tenant-a',
      contractId: 'c1',
      paymentTransactionId: 'tx-1',
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('ALREADY_APPLIED');
    expect(commands.enqueue).not.toHaveBeenCalled();
  });
});
