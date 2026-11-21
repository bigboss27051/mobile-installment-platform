import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceAuditAction,
  DeviceCommandStatus,
  DeviceLifecycleStatus,
  DeviceRecoveryStatus,
  DeviceRecoveryType,
  EnrollmentSessionStatus,
  PlatformEnforcementState,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_SESSION_STATUSES: EnrollmentSessionStatus[] = [
  EnrollmentSessionStatus.NOT_STARTED,
  EnrollmentSessionStatus.WAITING_FOR_DEVICE,
  EnrollmentSessionStatus.QR_GENERATED,
  EnrollmentSessionStatus.PROVISIONING,
  EnrollmentSessionStatus.ENROLLING,
  EnrollmentSessionStatus.VERIFYING,
  EnrollmentSessionStatus.ACTIVATING,
  EnrollmentSessionStatus.RECOVERY_REQUIRED,
];

const OPEN_COMMAND_STATUSES: DeviceCommandStatus[] = [
  DeviceCommandStatus.QUEUED,
  DeviceCommandStatus.SENT,
];

@Injectable()
export class DeviceRecoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async request(
    user: TenantContext,
    deviceId: string,
    input: { type: DeviceRecoveryType; reason: string },
  ) {
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ConflictException('RECOVERY_REASON_REQUIRED');
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }
    if (input.type !== DeviceRecoveryType.REENROLL) {
      throw new ConflictException('RECOVERY_TYPE_UNSUPPORTED');
    }

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.deviceEnrollmentSession.updateMany({
        where: {
          tenantId,
          deviceId: device.id,
          status: { in: OPEN_SESSION_STATUSES },
        },
        data: {
          status: EnrollmentSessionStatus.CANCELLED,
          lastErrorCode: 'RECOVERY_REENROLL',
          // Release unique(device_id) so a new session can check-in to the same device.
          deviceId: null,
        },
      });
      // Detach any historical row still holding this device_id (e.g. COMPLETED/CANCELLED).
      await tx.deviceEnrollmentSession.updateMany({
        where: {
          tenantId,
          deviceId: device.id,
        },
        data: {
          deviceId: null,
          lastErrorCode: 'RECOVERY_REENROLL',
        },
      });
      // Also cancel open sessions for same IMEI/contract that are not yet device-bound
      await tx.deviceEnrollmentSession.updateMany({
        where: {
          tenantId,
          imeiUnitId: device.imeiUnitId,
          deviceId: null,
          status: { in: OPEN_SESSION_STATUSES },
        },
        data: {
          status: EnrollmentSessionStatus.CANCELLED,
          lastErrorCode: 'RECOVERY_REENROLL',
        },
      });
      await tx.deviceCommand.updateMany({
        where: {
          tenantId,
          deviceId: device.id,
          status: { in: OPEN_COMMAND_STATUSES },
        },
        data: {
          status: DeviceCommandStatus.EXPIRED,
          resultCode: 'RECOVERY_REENROLL',
        },
      });
      await tx.device.update({
        where: { id: device.id },
        data: {
          status: DeviceLifecycleStatus.PENDING_ENROLL,
          agentTokenHash: null,
        },
      });
      await tx.devicePolicyState.upsert({
        where: { deviceId: device.id },
        create: {
          tenantId,
          deviceId: device.id,
          desiredPresentation: DesiredPresentation.NONE,
          platformState: PlatformEnforcementState.NONE,
          policyVersion: 1,
        },
        update: {
          desiredPresentation: DesiredPresentation.NONE,
          platformState: PlatformEnforcementState.NONE,
          policyVersion: { increment: 1 },
        },
      });
      const recovery = await tx.deviceRecoveryRequest.create({
        data: {
          tenantId,
          deviceId: device.id,
          type: DeviceRecoveryType.REENROLL,
          status: DeviceRecoveryStatus.APPROVED,
          reason,
          actorUserId: user.userId,
        },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: device.id,
          actorUserId: user.userId,
          action: DeviceAuditAction.RECOVERY,
          reason: `REENROLL: ${reason}`,
        },
      });
      return recovery;
    });
  }
}
