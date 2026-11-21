import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceCommandStatus,
  DeviceCommandType,
  DeviceLocationSource,
  PlatformEnforcementState,
} from '@prisma/client';
import {
  desiredPresentationForCommand,
  DeviceCommandsService,
} from './device-commands.service';
import { hashDeviceAgentToken } from './device-agent-token';

describe('DeviceCommandsService', () => {
  const prisma = {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    deviceCommand: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    devicePolicyState: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    deviceAuditEvent: { create: jest.fn() },
    deviceLocationSample: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const locations = {
    persistSample: jest.fn(),
    clearForDevice: jest.fn(),
  };

  const service = new DeviceCommandsService(
    prisma as never,
    locations as never,
  );
  const user = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    role: 'MERCHANT_OWNER',
  } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
  });

  it('maps command types to desired presentations', () => {
    expect(desiredPresentationForCommand(DeviceCommandType.START_LOCK_TASK)).toBe(
      'LOCK',
    );
    expect(
      desiredPresentationForCommand(DeviceCommandType.START_PACKAGE_SUSPEND),
    ).toBe('RESTRICT');
    expect(
      desiredPresentationForCommand(DeviceCommandType.STOP_PACKAGE_SUSPEND),
    ).toBe('NONE');
    expect(desiredPresentationForCommand(DeviceCommandType.STOP_LOCK_TASK)).toBe(
      'NONE',
    );
  });

  it('rejects enqueue without a reason', async () => {
    await expect(
      service.enqueue(user, 'dev-1', {
        type: DeviceCommandType.START_LOCK_TASK,
        reason: '  ',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enqueues START_LOCK_TASK for a tenant device', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
    });
    prisma.deviceCommand.create.mockResolvedValue({
      id: 'cmd-1',
      type: DeviceCommandType.START_LOCK_TASK,
      status: DeviceCommandStatus.QUEUED,
      reason: 'lab lock',
    });
    prisma.devicePolicyState.upsert.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    const result = await service.enqueue(user, 'dev-1', {
      type: DeviceCommandType.START_LOCK_TASK,
      reason: 'lab lock',
    });

    expect(result.id).toBe('cmd-1');
    expect(prisma.deviceCommand.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-a',
          deviceId: 'dev-1',
          type: DeviceCommandType.START_LOCK_TASK,
          reason: 'lab lock',
          status: DeviceCommandStatus.QUEUED,
        }),
      }),
    );
  });

  it('denies enqueue for another tenant device', async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    await expect(
      service.enqueue(user, 'dev-x', {
        type: DeviceCommandType.START_LOCK_TASK,
        reason: 'nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists queued commands for a valid agent token and marks SENT', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.deviceCommand.findMany.mockResolvedValue([
      {
        id: 'cmd-1',
        type: DeviceCommandType.START_LOCK_TASK,
        status: DeviceCommandStatus.QUEUED,
        reason: 'lab',
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    prisma.deviceCommand.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.pollForAgent(raw);
    expect(result.deviceId).toBe('dev-1');
    expect(result.commands).toHaveLength(1);
    expect(prisma.deviceCommand.updateMany).toHaveBeenCalled();
  });

  it('rejects a missing agent token', async () => {
    await expect(service.pollForAgent('')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns NONE policy when the device has no policy row', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.devicePolicyState.findUnique.mockResolvedValue(null);

    const result = await service.policyForAgent(raw);
    expect(result).toEqual({
      deviceId: 'dev-1',
      desiredPresentation: 'NONE',
      platformState: 'NONE',
      policyVersion: 0,
    });
  });

  it('returns stored desired and platform policy for the agent', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.devicePolicyState.findUnique.mockResolvedValue({
      desiredPresentation: 'LOCK',
      platformState: 'LOCK_TASK',
      policyVersion: 3,
    });

    const result = await service.policyForAgent(raw);
    expect(result.desiredPresentation).toBe('LOCK');
    expect(result.platformState).toBe('LOCK_TASK');
    expect(result.policyVersion).toBe(3);
  });

  it('enqueues START_PACKAGE_SUSPEND with desired RESTRICT', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
    });
    prisma.deviceCommand.create.mockResolvedValue({
      id: 'cmd-suspend',
      type: DeviceCommandType.START_PACKAGE_SUSPEND,
      status: DeviceCommandStatus.QUEUED,
    });
    prisma.devicePolicyState.upsert.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});

    await service.enqueue(user, 'dev-1', {
      type: DeviceCommandType.START_PACKAGE_SUSPEND,
      reason: 'lab restrict',
    });

    expect(prisma.devicePolicyState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          desiredPresentation: 'RESTRICT',
        }),
      }),
    );
  });

  it('records heartbeat for a valid agent token', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    const stamped = new Date('2026-11-21T12:00:00.000Z');
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      lastHeartbeatAt: stamped,
    });
    prisma.devicePolicyState.findUnique.mockResolvedValue({
      policyVersion: 2,
      desiredPresentation: 'NONE',
    });

    const result = await service.heartbeatForAgent(raw, {
      policyVersion: 2,
      connectivity: 'WIFI',
      batteryPercent: 80,
    });

    expect(result.deviceId).toBe('dev-1');
    expect(result.lastHeartbeatAt).toBe(stamped.toISOString());
    expect(result.locationAccepted).toBe(false);
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ lastHeartbeatAt: expect.any(Date) }),
      }),
    );
  });

  it('rejects location on heartbeat when desired is NONE', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.devicePolicyState.findUnique.mockResolvedValue({
      desiredPresentation: 'NONE',
      policyVersion: 1,
    });

    await expect(
      service.heartbeatForAgent(raw, {
        location: {
          lat: 13.7,
          lng: 100.5,
          source: DeviceLocationSource.NETWORK,
          capturedAt: '2026-11-21T12:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(locations.persistSample).not.toHaveBeenCalled();
  });

  it('accepts location on heartbeat when desired is LOCK', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.devicePolicyState.findUnique.mockResolvedValue({
      desiredPresentation: 'LOCK',
      policyVersion: 3,
    });
    const stamped = new Date('2026-11-21T12:00:00.000Z');
    prisma.device.update.mockResolvedValue({
      id: 'dev-1',
      lastHeartbeatAt: stamped,
    });
    locations.persistSample.mockResolvedValue(undefined);

    const result = await service.heartbeatForAgent(raw, {
      location: {
        lat: 13.7563,
        lng: 100.5018,
        accuracyMeters: 90,
        source: DeviceLocationSource.NETWORK,
        capturedAt: '2026-11-21T12:00:00.000Z',
      },
    });

    expect(result.locationAccepted).toBe(true);
    expect(locations.persistSample).toHaveBeenCalled();
  });

  it('clears location when enqueueing STOP that sets desired NONE', async () => {
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      platform: 'ANDROID',
    });
    prisma.deviceCommand.create.mockResolvedValue({ id: 'cmd-1' });
    prisma.devicePolicyState.upsert.mockResolvedValue({});
    prisma.deviceAuditEvent.create.mockResolvedValue({});
    locations.clearForDevice.mockResolvedValue(undefined);

    await service.enqueue(user, 'dev-1', {
      type: DeviceCommandType.STOP_LOCK_TASK,
      reason: 'paid',
    });

    expect(locations.clearForDevice).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
    );
  });

  it('rejects heartbeat with an invalid agent token', async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    await expect(
      service.heartbeatForAgent('dat_bad', { connectivity: 'WIFI' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acks START_LOCK_TASK success and sets platform LOCK_TASK', async () => {
    const raw = 'dat_lab_token';
    prisma.device.findFirst.mockResolvedValue({
      id: 'dev-1',
      tenantId: 'tenant-a',
      agentTokenHash: hashDeviceAgentToken(raw),
    });
    prisma.deviceCommand.findFirst.mockResolvedValue({
      id: 'cmd-1',
      deviceId: 'dev-1',
      tenantId: 'tenant-a',
      type: DeviceCommandType.START_LOCK_TASK,
      status: DeviceCommandStatus.SENT,
    });
    prisma.deviceCommand.update.mockResolvedValue({
      id: 'cmd-1',
      status: DeviceCommandStatus.ACKED_SUCCESS,
    });
    prisma.devicePolicyState.upsert.mockResolvedValue({});

    const result = await service.ackForAgent(raw, 'cmd-1', {
      status: DeviceCommandStatus.ACKED_SUCCESS,
      platformState: PlatformEnforcementState.LOCK_TASK,
      resultCode: 'LOCK_TASK_ACTIVE',
    });

    expect(result.status).toBe(DeviceCommandStatus.ACKED_SUCCESS);
    expect(prisma.devicePolicyState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          platformState: PlatformEnforcementState.LOCK_TASK,
          desiredPresentation: 'LOCK',
        }),
      }),
    );
  });
});
