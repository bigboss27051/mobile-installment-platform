import { Injectable } from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceLocationSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SoftLocationInput = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  source: DeviceLocationSource;
  capturedAt: Date;
};

const ARREARS_DESIRED: DesiredPresentation[] = [
  DesiredPresentation.RESTRICT,
  DesiredPresentation.LOCK,
];

const RETENTION_DAYS = 14;

@Injectable()
export class DeviceLocationService {
  constructor(private readonly prisma: PrismaService) {}

  static allowsLocation(desired: DesiredPresentation | null | undefined): boolean {
    return !!desired && ARREARS_DESIRED.includes(desired);
  }

  async persistSample(
    tx: Prisma.TransactionClient | PrismaService,
    input: {
      tenantId: string;
      deviceId: string;
      location: SoftLocationInput;
    },
  ) {
    const { tenantId, deviceId, location } = input;
    await tx.deviceLocationSample.create({
      data: {
        tenantId,
        deviceId,
        lat: location.lat,
        lng: location.lng,
        accuracyMeters: location.accuracyMeters ?? null,
        source: location.source,
        capturedAt: location.capturedAt,
      },
    });
    await tx.device.update({
      where: { id: deviceId },
      data: {
        lastLocationLat: location.lat,
        lastLocationLng: location.lng,
        lastLocationAccuracyM: location.accuracyMeters ?? null,
        lastLocationSource: location.source,
        lastLocationAt: location.capturedAt,
      },
    });
  }

  async clearForDevice(
    tx: Prisma.TransactionClient | PrismaService,
    deviceId: string,
  ) {
    await tx.deviceLocationSample.deleteMany({ where: { deviceId } });
    await tx.device.update({
      where: { id: deviceId },
      data: {
        lastLocationLat: null,
        lastLocationLng: null,
        lastLocationAccuracyM: null,
        lastLocationSource: null,
        lastLocationAt: null,
      },
    });
  }

  async purgeOlderThan(
    days: number = RETENTION_DAYS,
    now: Date = new Date(),
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.deviceLocationSample.deleteMany({
      where: { capturedAt: { lt: cutoff } },
    });
    return result.count;
  }

  mapLastKnown(device: {
    lastLocationLat: Prisma.Decimal | null;
    lastLocationLng: Prisma.Decimal | null;
    lastLocationAccuracyM: number | null;
    lastLocationSource: DeviceLocationSource | null;
    lastLocationAt: Date | null;
  }) {
    if (
      device.lastLocationLat == null ||
      device.lastLocationLng == null ||
      !device.lastLocationAt ||
      !device.lastLocationSource
    ) {
      return null;
    }
    return {
      lat: Number(device.lastLocationLat),
      lng: Number(device.lastLocationLng),
      accuracyMeters: device.lastLocationAccuracyM,
      source: device.lastLocationSource,
      capturedAt: device.lastLocationAt.toISOString(),
    };
  }
}
