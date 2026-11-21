import { DeviceLocationSource } from '@prisma/client';
import { DeviceLocationService } from './device-location.service';

describe('DeviceLocationService', () => {
  const prisma = {
    deviceLocationSample: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    device: {
      update: jest.fn(),
    },
  };

  const service = new DeviceLocationService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows location only for RESTRICT and LOCK', () => {
    expect(DeviceLocationService.allowsLocation('NONE')).toBe(false);
    expect(DeviceLocationService.allowsLocation('REMINDER')).toBe(false);
    expect(DeviceLocationService.allowsLocation('RESTRICT')).toBe(true);
    expect(DeviceLocationService.allowsLocation('LOCK')).toBe(true);
  });

  it('persists sample and last-known without logging full coordinates in reason paths', async () => {
    prisma.deviceLocationSample.create.mockResolvedValue({});
    prisma.device.update.mockResolvedValue({});
    const capturedAt = new Date('2026-11-21T12:00:00.000Z');

    await service.persistSample(prisma as never, {
      tenantId: 'tenant-a',
      deviceId: 'dev-1',
      location: {
        lat: 13.7563,
        lng: 100.5018,
        accuracyMeters: 120,
        source: DeviceLocationSource.NETWORK,
        capturedAt,
      },
    });

    expect(prisma.deviceLocationSample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deviceId: 'dev-1',
          source: DeviceLocationSource.NETWORK,
          accuracyMeters: 120,
        }),
      }),
    );
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dev-1' },
        data: expect.objectContaining({
          lastLocationSource: DeviceLocationSource.NETWORK,
          lastLocationAt: capturedAt,
        }),
      }),
    );
  });

  it('clears samples and last-known for a device', async () => {
    prisma.deviceLocationSample.deleteMany.mockResolvedValue({ count: 2 });
    prisma.device.update.mockResolvedValue({});

    await service.clearForDevice(prisma as never, 'dev-1');

    expect(prisma.deviceLocationSample.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: 'dev-1' },
    });
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastLocationLat: null,
          lastLocationLng: null,
          lastLocationAt: null,
        }),
      }),
    );
  });

  it('purges samples older than retention window', async () => {
    prisma.deviceLocationSample.deleteMany.mockResolvedValue({ count: 3 });
    const now = new Date('2026-11-21T12:00:00.000Z');

    const count = await service.purgeOlderThan(14, now);

    expect(count).toBe(3);
    expect(prisma.deviceLocationSample.deleteMany).toHaveBeenCalledWith({
      where: {
        capturedAt: { lt: new Date('2026-11-07T12:00:00.000Z') },
      },
    });
  });

  it('maps last-known or null', () => {
    expect(
      service.mapLastKnown({
        lastLocationLat: null,
        lastLocationLng: null,
        lastLocationAccuracyM: null,
        lastLocationSource: null,
        lastLocationAt: null,
      }),
    ).toBeNull();

    const mapped = service.mapLastKnown({
      lastLocationLat: { toString: () => '13.7563' } as never,
      lastLocationLng: { toString: () => '100.5018' } as never,
      lastLocationAccuracyM: 80,
      lastLocationSource: DeviceLocationSource.FUSED,
      lastLocationAt: new Date('2026-11-21T12:00:00.000Z'),
    });
    expect(mapped).toEqual({
      lat: 13.7563,
      lng: 100.5018,
      accuracyMeters: 80,
      source: DeviceLocationSource.FUSED,
      capturedAt: '2026-11-21T12:00:00.000Z',
    });
  });
});
