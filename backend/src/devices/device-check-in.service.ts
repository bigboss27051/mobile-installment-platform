import {
  ConflictException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  DeviceAuditAction,
  DeviceLifecycleStatus,
  EnrollmentSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashEnrollmentToken } from './enrollment-token';

const CHECKIN_OPEN: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.QR_GENERATED,
  EnrollmentSessionStatus.PROVISIONING,
  EnrollmentSessionStatus.ENROLLING,
  EnrollmentSessionStatus.FAILED,
];

@Injectable()
export class DeviceCheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(
    rawToken: string,
    dto: {
      deviceOwner: boolean;
      sessionId?: string;
      errorCode?: string;
      serial?: string;
    },
  ) {
    const token = rawToken?.trim();
    if (!token) {
      throw new UnauthorizedException('ENROLLMENT_TOKEN_REQUIRED');
    }

    const session = await this.prisma.deviceEnrollmentSession.findFirst({
      where: { tokenHash: hashEnrollmentToken(token) },
    });
    if (!session) {
      throw new UnauthorizedException('ENROLLMENT_TOKEN_INVALID');
    }
    if (dto.sessionId && dto.sessionId !== session.id) {
      throw new ConflictException('SESSION_MISMATCH');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('ENROLLMENT_EXPIRED');
    }
    if (session.status === EnrollmentSessionStatus.CANCELLED) {
      throw new ConflictException('ENROLLMENT_CANCELLED');
    }
    if (!CHECKIN_OPEN.includes(session.status) && session.deviceId) {
      return {
        sessionId: session.id,
        deviceId: session.deviceId,
        deviceOwner: true,
        lastErrorCode: session.lastErrorCode,
      };
    }
    if (!CHECKIN_OPEN.includes(session.status)) {
      throw new ConflictException('SESSION_NOT_CHECKINABLE');
    }

    if (!dto.deviceOwner) {
      const errorCode = dto.errorCode?.trim() || 'NOT_DEVICE_OWNER';
      const updated = await this.prisma.deviceEnrollmentSession.update({
        where: { id: session.id },
        data: {
          status: EnrollmentSessionStatus.FAILED,
          lastErrorCode: errorCode,
        },
      });
      return {
        sessionId: session.id,
        deviceId: session.deviceId,
        deviceOwner: false,
        lastErrorCode: updated.lastErrorCode,
      };
    }

    const hardwareFingerprint = createHash('sha256')
      .update(`${session.tenantId}:${session.imeiUnitId}`)
      .digest('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      let device = session.deviceId
        ? await tx.device.findFirst({
            where: { id: session.deviceId, tenantId: session.tenantId },
          })
        : await tx.device.findFirst({
            where: {
              tenantId: session.tenantId,
              hardwareFingerprint,
            },
          });
      if (!device) {
        device = await tx.device.create({
          data: {
            tenantId: session.tenantId,
            imeiUnitId: session.imeiUnitId,
            platform: session.platform,
            status: DeviceLifecycleStatus.ENROLLED,
            hardwareFingerprint,
          },
        });
      }
      await tx.deviceEnrollmentSession.update({
        where: { id: session.id },
        data: {
          deviceId: device.id,
          status: EnrollmentSessionStatus.ENROLLING,
          lastErrorCode: null,
        },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId: session.tenantId,
          deviceId: device.id,
          actorUserId: session.createdByUserId,
          action: DeviceAuditAction.CHECK_IN,
          reason: dto.serial?.trim()
            ? `dpc-check-in serial=${dto.serial.trim()}`
            : 'dpc-check-in device-owner',
        },
      });
      return device;
    });

    return {
      sessionId: session.id,
      deviceId: result.id,
      deviceOwner: true,
      lastErrorCode: null as string | null,
    };
  }
}
