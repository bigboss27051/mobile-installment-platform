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
import { DeviceLocationService } from './device-location.service';

describe('DeviceLifecycleService', () => {
  const prisma = {
    deviceEnrollmentSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    contract: { findFirst: jest.fn() },
    device: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    deviceLocationSample: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const locations = new DeviceLocationService(prisma as never);
  const lockApprovals = {
    cancelPendingForDevice: jest.fn().mockResolvedValue(0),
  };
  const service = new DeviceLifecycleService(
    prisma as never,
    locations,
    lockApprovals as never,
  );
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
    prisma.deviceEnrollmentSession.updateMany.mockResolvedValue({ count: 0 });
  });

  it('returns dashboard fields and 404 for another tenant', async () => {
    prisma.device.findFirst.mockResolvedValueOnce({
      id: 'd1',
      platform: 'ANDROID',
      status: DeviceLifecycleStatus.ACTIVE,
      lastHeartbeatAt: new Date('2026-11-21T12:00:00.000Z'),
      lastLocationLat: null,
      lastLocationLng: null,
      lastLocationAccuracyM: null,
      lastLocationSource: null,
      lastLocationAt: null,
      enrollmentSession: { status: EnrollmentSessionStatus.QR_GENERATED },
      imeiUnit: { imei: '359999999999999' },
      policyState: {
        desiredPresentation: 'LOCK',
        platformState: 'LOCK_TASK',
        policyVersion: 4,
      },
      commands: [],
    });
    const view = await service.getDashboard(tenantCtx, 'd1');
    expect(view).toEqual(
      expect.objectContaining({
        id: 'd1',
        desiredPresentation: 'LOCK',
        platformState: 'LOCK_TASK',
        policyVersion: 4,
        lastHeartbeatAt: '2026-11-21T12:00:00.000Z',
        lastKnownLocation: null,
        locationUpdatedAt: null,
        lastCommand: null,
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

  it('lists only tenant devices with masked IMEI', async () => {
    prisma.device.findMany.mockResolvedValueOnce([
      {
        id: 'd1',
        platform: 'ANDROID',
        status: DeviceLifecycleStatus.ACTIVE,
        lastHeartbeatAt: new Date('2026-11-21T13:00:00.000Z'),
        imeiUnit: { imei: '359999999999999' },
        policyState: {
          desiredPresentation: 'NONE',
          platformState: 'NONE',
          policyVersion: 1,
        },
        enrollmentSession: { status: EnrollmentSessionStatus.COMPLETED },
      },
    ]);
    const rows = await service.listDevices(tenantCtx, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].maskedImei).toBe('••••9999');
    expect(JSON.stringify(rows)).not.toContain('359999999999999');
    expect(prisma.device.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
  });

  it('includes last command summary on the dashboard', async () => {
    prisma.device.findFirst.mockResolvedValueOnce({
      id: 'd1',
      platform: 'ANDROID',
      status: DeviceLifecycleStatus.ACTIVE,
      lastHeartbeatAt: null,
      lastLocationLat: null,
      lastLocationLng: null,
      lastLocationAccuracyM: null,
      lastLocationSource: null,
      lastLocationAt: null,
      enrollmentSession: { status: EnrollmentSessionStatus.COMPLETED },
      imeiUnit: { imei: '359999999999999' },
      policyState: {
        desiredPresentation: 'RESTRICT',
        platformState: 'PACKAGES_SUSPENDED',
        policyVersion: 6,
      },
      commands: [
        {
          id: 'cmd-9',
          type: 'START_PACKAGE_SUSPEND',
          status: 'ACKED_SUCCESS',
          resultCode: 'PACKAGES_SUSPENDED:3',
          ackedAt: new Date('2026-11-21T13:10:00.000Z'),
        },
      ],
    });
    const view = await service.getDashboard(tenantCtx, 'd1');
    expect(view.lastCommand).toEqual({
      id: 'cmd-9',
      type: 'START_PACKAGE_SUSPEND',
      status: 'ACKED_SUCCESS',
      resultCode: 'PACKAGES_SUSPENDED:3',
      ackedAt: '2026-11-21T13:10:00.000Z',
    });
  });

  it('returns location history for tenant device and audits read', async () => {
    prisma.device.findFirst.mockResolvedValueOnce({ id: 'd1' });
    prisma.deviceLocationSample.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        lat: { toString: () => '13.75' },
        lng: { toString: () => '100.50' },
        accuracyMeters: 100,
        source: 'NETWORK',
        capturedAt: new Date('2026-11-21T12:00:00.000Z'),
      },
    ]);
    prisma.deviceAuditEvent.create.mockResolvedValueOnce({});

    const history = await service.getLocationHistory(tenantCtx, 'd1');
    expect(history.samples).toHaveLength(1);
    expect(history.samples[0].source).toBe('NETWORK');
    expect(prisma.deviceAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOCATION_READ',
          deviceId: 'd1',
        }),
      }),
    );

    prisma.device.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getLocationHistory(tenantCtx, 'other'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns heartbeat freshness and 410 when never seen', async () => {
    const recent = new Date(Date.now() - 30_000);
    prisma.device.findFirst.mockResolvedValueOnce({
      id: 'd1',
      lastHeartbeatAt: recent,
      policyState: { policyVersion: 3 },
    });
    const hb = await service.getHeartbeat(tenantCtx, 'd1');
    expect(hb.lastHeartbeatAt).toBe(recent.toISOString());
    expect(hb.policyVersion).toBe(3);
    expect(hb.fresh).toBe(true);

    prisma.device.findFirst.mockResolvedValueOnce({
      id: 'd1',
      lastHeartbeatAt: null,
      policyState: null,
    });
    await expect(service.getHeartbeat(tenantCtx, 'd1')).rejects.toBeInstanceOf(
      GoneException,
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

  it('activates an existing check-in device without creating a second device', async () => {
    prisma.deviceActivation.findFirst.mockResolvedValue(null);
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      deviceId: 'dev-checked-in',
      status: EnrollmentSessionStatus.ENROLLING,
    });
    prisma.contract.findFirst.mockResolvedValue(contract);
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-checked-in',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.PENDING_ENROLL,
    });
    prisma.device.update.mockResolvedValue({
      id: 'dev-checked-in',
      tenantId: 'tenant-a',
      imeiUnitId: 'imei-1',
      status: DeviceLifecycleStatus.ACTIVE,
    });
    prisma.deviceActivation.create.mockResolvedValue({
      id: 'act-ci',
      tenantId: 'tenant-a',
      deviceId: 'dev-checked-in',
      enrollmentSessionId: 'sess-1',
      contractId: 'c1',
      customerId: 'cust-1',
      reason: 'after check-in',
      shopCode: null,
      createdAt: new Date(),
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.activate(
      tenantCtx,
      { enrollmentSessionId: 'sess-1', contractId: 'c1', reason: 'after check-in' },
      'idem-checkin',
    );

    expect(result.deviceId).toBe('dev-checked-in');
    expect(prisma.device.create).not.toHaveBeenCalled();
    expect(prisma.device.update).toHaveBeenCalled();
  });

  it('creates device + activation without calling AMAPI or Apple', async () => {
    prisma.deviceActivation.findFirst.mockResolvedValue(null);
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue(session);
    prisma.contract.findFirst.mockResolvedValue(contract);
    prisma.device.findFirst.mockResolvedValue(null);
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

  it('reuses an activation when the same device and contract check in again', async () => {
    prisma.deviceActivation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'act-1',
        deviceId: 'dev-1',
        enrollmentSessionId: 'old-sess',
        contractId: 'c1',
        customerId: 'cust-1',
        reason: 'first handover',
        shopCode: null,
        createdAt: new Date('2026-11-16T04:25:14.000Z'),
      });
    prisma.deviceEnrollmentSession.findFirst.mockResolvedValue({
      ...session,
      status: EnrollmentSessionStatus.ENROLLING,
      deviceId: 'dev-1',
    });
    prisma.contract.findFirst.mockResolvedValue(contract);
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      status: DeviceLifecycleStatus.ACTIVE,
    });
    prisma.deviceEnrollmentSession.update.mockResolvedValue({});

    const result = await service.activate(
      tenantCtx,
      { enrollmentSessionId: 'sess-1', contractId: 'c1', reason: 're-enroll' },
      'idem-reenroll',
    );

    expect(result.alreadyActivated).toBe(true);
    expect(result.deviceId).toBe('dev-1');
    expect(prisma.deviceActivation.create).not.toHaveBeenCalled();
    expect(prisma.deviceEnrollmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1' },
        data: expect.objectContaining({
          status: EnrollmentSessionStatus.ACTIVATING,
          deviceId: 'dev-1',
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

  it('completes the open session when the same contract is already bound', async () => {
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
        contractId: 'c1',
        status: DeviceBindingStatus.ACTIVE,
        bindIdempotencyKey: 'old-key',
      });

    const result = await service.bindContract(
      tenantCtx,
      'dev-1',
      { contractId: 'c1', reason: 're-enroll bind' },
      'bind-same',
    );

    expect(result.id).toBe('bind-existing');
    expect(prisma.deviceContractBinding.create).not.toHaveBeenCalled();
    expect(prisma.deviceEnrollmentSession.updateMany).toHaveBeenCalledWith({
      where: { deviceId: 'dev-1', tenantId: 'tenant-a' },
      data: { status: EnrollmentSessionStatus.COMPLETED },
    });
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
