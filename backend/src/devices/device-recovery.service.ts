import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceAuditAction,
  DeviceBindingStatus,
  DeviceCommandStatus,
  DeviceLifecycleStatus,
  DeviceLockApprovalStatus,
  DeviceRecoveryStatus,
  DeviceRecoveryType,
  EnrollmentSessionStatus,
  PlatformEnforcementState,
  Prisma,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceLocationService } from './device-location.service';

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

const UNENROLL_LIKE: DeviceRecoveryType[] = [
  DeviceRecoveryType.UNENROLL,
  DeviceRecoveryType.RELEASE,
  DeviceRecoveryType.CONTRACT_CLOSE,
];

type Tx = Prisma.TransactionClient;

@Injectable()
export class DeviceRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: DeviceLocationService,
  ) {}

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
    if (!Object.values(DeviceRecoveryType).includes(input.type)) {
      throw new ConflictException('RECOVERY_TYPE_UNSUPPORTED');
    }

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }

    const type = input.type;
    const resultTag = `RECOVERY_${type}`;

    return this.prisma.$transaction(async (tx) => {
      await this.applySharedCleanup(tx, {
        tenantId,
        deviceId: device.id,
        imeiUnitId: device.imeiUnitId,
        resultTag,
        cancelReason: `cancel:recovery ${reason}`,
      });

      if (type === DeviceRecoveryType.REENROLL) {
        await tx.device.update({
          where: { id: device.id },
          data: {
            status: DeviceLifecycleStatus.PENDING_ENROLL,
            agentTokenHash: null,
          },
        });
      } else if (type === DeviceRecoveryType.REPLACE) {
        await this.closeActiveBinding(
          tx,
          {
            tenantId,
            deviceId: device.id,
            actorUserId: user.userId,
            reason,
          },
          DeviceBindingStatus.REPLACED,
        );
        await tx.device.update({
          where: { id: device.id },
          data: {
            status: DeviceLifecycleStatus.UNENROLLED,
            agentTokenHash: null,
          },
        });
      } else if (UNENROLL_LIKE.includes(type)) {
        await this.closeActiveBinding(
          tx,
          {
            tenantId,
            deviceId: device.id,
            actorUserId: user.userId,
            reason,
          },
          DeviceBindingStatus.UNBOUND,
        );
        await tx.device.update({
          where: { id: device.id },
          data: {
            status: DeviceLifecycleStatus.UNENROLLED,
            agentTokenHash: null,
          },
        });
      } else {
        throw new ConflictException('RECOVERY_TYPE_UNSUPPORTED');
      }

      const recovery = await tx.deviceRecoveryRequest.create({
        data: {
          tenantId,
          deviceId: device.id,
          type,
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
          reason: `${type}: ${reason}`,
        },
      });
      return recovery;
    });
  }

  private async applySharedCleanup(
    tx: Tx,
    args: {
      tenantId: string;
      deviceId: string;
      imeiUnitId: string | null;
      resultTag: string;
      cancelReason: string;
    },
  ) {
    const { tenantId, deviceId, imeiUnitId, resultTag, cancelReason } = args;

    await tx.deviceEnrollmentSession.updateMany({
      where: {
        tenantId,
        deviceId,
        status: { in: OPEN_SESSION_STATUSES },
      },
      data: {
        status: EnrollmentSessionStatus.CANCELLED,
        lastErrorCode: resultTag,
        deviceId: null,
      },
    });
    await tx.deviceEnrollmentSession.updateMany({
      where: {
        tenantId,
        deviceId,
      },
      data: {
        deviceId: null,
        lastErrorCode: resultTag,
      },
    });
    if (imeiUnitId) {
      await tx.deviceEnrollmentSession.updateMany({
        where: {
          tenantId,
          imeiUnitId,
          deviceId: null,
          status: { in: OPEN_SESSION_STATUSES },
        },
        data: {
          status: EnrollmentSessionStatus.CANCELLED,
          lastErrorCode: resultTag,
        },
      });
    }
    await tx.deviceCommand.updateMany({
      where: {
        tenantId,
        deviceId,
        status: { in: OPEN_COMMAND_STATUSES },
      },
      data: {
        status: DeviceCommandStatus.EXPIRED,
        resultCode: resultTag,
      },
    });
    await tx.devicePolicyState.upsert({
      where: { deviceId },
      create: {
        tenantId,
        deviceId,
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
    await this.locations.clearForDevice(tx, deviceId);
    await tx.deviceLockApproval.updateMany({
      where: {
        tenantId,
        deviceId,
        status: DeviceLockApprovalStatus.PENDING,
      },
      data: {
        status: DeviceLockApprovalStatus.CANCELLED,
        resolvedAt: new Date(),
        reason: cancelReason,
      },
    });
  }

  private async closeActiveBinding(
    tx: Tx,
    args: {
      tenantId: string;
      deviceId: string;
      actorUserId: string;
      reason: string;
    },
    nextStatus: typeof DeviceBindingStatus.REPLACED | typeof DeviceBindingStatus.UNBOUND,
  ) {
    const active = await tx.deviceContractBinding.findFirst({
      where: {
        tenantId: args.tenantId,
        deviceId: args.deviceId,
        status: DeviceBindingStatus.ACTIVE,
      },
    });
    if (!active) {
      return;
    }
    await tx.deviceContractBinding.update({
      where: { id: active.id },
      data: {
        status: nextStatus,
        unbindReason: args.reason,
        unbindActorUserId: args.actorUserId,
        unboundAt: new Date(),
      },
    });
  }
}
