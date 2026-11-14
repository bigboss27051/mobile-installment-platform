import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  DeviceBindingStatus,
  DeviceLifecycleStatus,
  EnrollmentSessionStatus,
  PlatformRole,
} from '@prisma/client';
import { DeviceLifecycleService } from './device-lifecycle.service';

describe('DeviceLifecycleService', () => {
  const prisma = {
    deviceEnrollmentSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    contract: { findFirst: jest.fn() },
    device: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    deviceActivation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    deviceContractBinding: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deviceAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new DeviceLifecycleService(prisma as never);
  const tenantCtx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };
  const staffCtx = {
    tenantId: 'tenant-a',
    userId: 'staff-1',
    role: PlatformRole.MERCHANT_STAFF,
  };
  const session = {
    id: 'sess-1',
    tenantId: 'tenant-a',
    contractId: 'c1',
    imeiUnitId: 'imei-1',
    platform: 'ANDROID',
    status: EnrollmentSessionStatus.WAITING_FOR_DEVICE,
    expiresAt: new Date(Date.now() + 60_000),
    deviceId: null,
  };
  const contract = {
    id: 'c1',
    tenantId: 'tenant-a',
    customerId: 'cust-1',
    imeiUnitId: 'imei-1',
    status: ContractStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
  });

  it('returns dashboard fields and 404 for another tenant', async () => {
    prisma.device.findFirst.mockResolvedValueOnce({
      id: 'd1',
      platform: 'ANDROID',
      status: DeviceLifecycleStatus.ACTIVE,
      enrollmentSession: { status: EnrollmentSessionStatus.QR_GENERATED },
      imeiUnit: { imei: '359999999999999' },
    });
    const view = await service.getDashboard(tenantCtx, 'd1');
    expect(view).toEqual(
      expect.objectContaining({
        id: 'd1',
        desiredPresentation: 'NONE',
        platformState: 'NONE',
        enrollmentStatus: 'QR_GENERATED',
        outstandingBalance: null,
      }),
    );
    expect(JSON.stringify(view)).not.toContain('359999999999999');

    prisma.device.findFirst.mockResolvedValueOnce(null);
    await expect(service.getDashboard(tenantCtx, 'other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects activate without tenant', async () => {
    await expect(
      service.activate(
        { tenantId: null, userId: 'x', role: PlatformRole.SUPER_ADMIN },
        {
          enrollmentSessionId: 'sess-1',
          contractId: 'c1',
        },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects activate when session belongs to another tenant', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(null);
    await expect(
      service.activate(
        tenantCtx,
        { enrollmentSessionId: 'sess-other', contractId: 'c1' },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects expired enrollment sessions', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.activate(
        tenantCtx,
        { enrollmentSessionId: 'sess-1', contractId: 'c1' },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('rejects cancelled enrollment sessions', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      status: EnrollmentSessionStatus.CANCELLED,
    });
    await expect(
      service.activate(
        tenantCtx,
        { enrollmentSessionId: 'sess-1', contractId: 'c1' },
        'idem-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects activate when contract IMEI does not match the session', async () => {
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.contract.findFirst.mockResolvedValue({
      ...contract,
      imeiUnitId: 'imei-other',
    });
    await expect(
      service.activate(
        tenantCtx,
        { enrollmentSessionId: 'sess-1', contractId: 'c1' },
        'idem-1',
      ),
    ).rejects.toMatchObject({ message: 'IMEI_DOES_NOT_MATCH_CONTRACT' });
  });

  it('returns the existing activation for the same idempotency key', async () => {
    prisma.deviceActivation.findFirst.mockResolvedValue({
      id: 'act-1',
      tenantId: 'tenant-a',
      deviceId: 'dev-1',
      enrollmentSessionId: 'sess-1',
      contractId: 'c1',
      customerId: 'cust-1',
      reason: 'staff-confirmed activation',
      shopCode: null,
      idempotencyKey: 'idem-1',
      createdAt: new Date(),
      device: { id: 'dev-1', status: DeviceLifecycleStatus.ACTIVE },
    });
    const result = await service.activate(
      tenantCtx,
      { enrollmentSessionId: 'sess-1', contractId: 'c1' },
      'idem-1',
    );
    expect(result.deviceId).toBe('dev-1');
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it('creates device + activation without calling AMAPI or Apple', async () => {
    prisma.deviceActivation.findFirst.mockResolvedValue(null);
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.contract.findFirst.mockResolvedValue(contract);
    prisma.device.create.mockResolvedValue({
      id: 'dev-new',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
    });
    prisma.deviceActivation.create.mockResolvedValue({
      id: 'act-new',
      tenantId: 'tenant-a',
      deviceId: 'dev-new',
      enrollmentSessionId: 'sess-1',
      contractId: 'c1',
      customerId: 'cust-1',
      reason: 'handover desk',
      shopCode: 'SHOP1',
      createdAt: new Date(),
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.activate(
      tenantCtx,
      {
        enrollmentSessionId: 'sess-1',
        contractId: 'c1',
        shopCode: 'SHOP1',
        reason: 'handover desk',
      },
      'idem-new',
    );

    expect(result.deviceId).toBe('dev-new');
    expect(result.alreadyActivated).toBe(false);
    const createdDevice = prisma.device.create.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    expect(createdDevice).not.toHaveProperty('amapi');
    expect(createdDevice).not.toHaveProperty('mdm');
    expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ACTIVATE',
          reason: 'handover desk',
        }),
      }),
    );
  });

  it('bind requires a reason and matching contract IMEI', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
      activation: { id: 'act-1' },
    });
    prisma.contract.findFirst.mockResolvedValue({
      ...contract,
      imeiUnitId: 'imei-other',
    });
    await expect(
      service.bindContract(
        tenantCtx,
        'dev-1',
        { contractId: 'c1', reason: 'bind after verify' },
        'bind-1',
      ),
    ).rejects.toMatchObject({ message: 'IMEI_DOES_NOT_MATCH_CONTRACT' });
  });

  it('rejects a second active bind on the same device', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
      activation: { id: 'act-1' },
    });
    prisma.contract.findFirst.mockResolvedValue(contract);
    prisma.deviceContractBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'bind-existing',
        deviceId: 'dev-1',
        contractId: 'c-other',
        status: DeviceBindingStatus.ACTIVE,
        bindIdempotencyKey: 'other-key',
      });
    await expect(
      service.bindContract(
        tenantCtx,
        'dev-1',
        { contractId: 'c1', reason: 'second bind' },
        'bind-2',
      ),
    ).rejects.toMatchObject({ message: 'IMEI_BOUND' });
  });

  it('unbind requires an elevated role and a reason', async () => {
    await expect(
      service.unbindContract(
        staffCtx,
        'dev-1',
        { reason: 'customer returned' },
        'unbind-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
    });
    prisma.deviceContractBinding.findFirst.mockResolvedValue({
      id: 'bind-1',
      status: DeviceBindingStatus.ACTIVE,
      reason: 'original',
    });
    prisma.deviceContractBinding.update.mockResolvedValue({
      id: 'bind-1',
      status: DeviceBindingStatus.UNBOUND,
      unbindReason: 'customer returned',
    });
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.unbindContract(
      tenantCtx,
      'dev-1',
      { reason: 'customer returned' },
      'unbind-1',
    );
    expect(result.status).toBe(DeviceBindingStatus.UNBOUND);
    expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'UNBIND', reason: 'customer returned' }),
      }),
    );
  });
});
