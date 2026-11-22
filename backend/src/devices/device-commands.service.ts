import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DesiredPresentation,
  DeviceAuditAction,
  DeviceCommandStatus,
  DeviceCommandType,
  DeviceLocationSource,
  PlatformEnforcementState,
} from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { hashDeviceAgentToken } from './device-agent-token';
import { DeviceLocationService } from './device-location.service';

const OPEN_STATUSES: DeviceCommandStatus[] = [
  DeviceCommandStatus.QUEUED,
  DeviceCommandStatus.SENT,
];

export function desiredPresentationForCommand(
  type: DeviceCommandType,
): DesiredPresentation {
  switch (type) {
    case DeviceCommandType.START_LOCK_TASK:
      return DesiredPresentation.LOCK;
    case DeviceCommandType.START_PACKAGE_SUSPEND:
      return DesiredPresentation.RESTRICT;
    case DeviceCommandType.STOP_LOCK_TASK:
    case DeviceCommandType.STOP_PACKAGE_SUSPEND:
      return DesiredPresentation.NONE;
    default:
      return DesiredPresentation.NONE;
  }
}

@Injectable()
export class DeviceCommandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: DeviceLocationService,
  ) {}

  async enqueue(
    user: TenantContext,
    deviceId: string,
    input: { type: DeviceCommandType; reason: string },
  ) {
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ConflictException('COMMAND_REASON_REQUIRED');
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }
    if (device.platform !== 'ANDROID') {
      throw new ConflictException('COMMAND_PLATFORM_UNSUPPORTED');
    }

    const desired = desiredPresentationForCommand(input.type);

    return this.prisma.$transaction(async (tx) => {
      const command = await tx.deviceCommand.create({
        data: {
          tenantId,
          deviceId: device.id,
          type: input.type,
          status: DeviceCommandStatus.QUEUED,
          reason,
          actorUserId: user.userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await tx.devicePolicyState.upsert({
        where: { deviceId: device.id },
        create: {
          tenantId,
          deviceId: device.id,
          desiredPresentation: desired,
          platformState: PlatformEnforcementState.PENDING,
          policyVersion: 1,
        },
        update: {
          desiredPresentation: desired,
          platformState: PlatformEnforcementState.PENDING,
          policyVersion: { increment: 1 },
        },
      });
      await tx.deviceAuditEvent.create({
        data: {
          tenantId,
          deviceId: device.id,
          actorUserId: user.userId,
          action: DeviceAuditAction.COMMAND,
          reason: `${input.type}: ${reason}`,
        },
      });
      if (desired === DesiredPresentation.NONE) {
        await this.locations.clearForDevice(tx, device.id);
      }
      return command;
    });
  }

  async policyForAgent(rawToken: string) {
    const device = await this.requireAgentDevice(rawToken);
    const state = await this.prisma.devicePolicyState.findUnique({
      where: { deviceId: device.id },
    });
    return {
      deviceId: device.id,
      desiredPresentation: state?.desiredPresentation ?? DesiredPresentation.NONE,
      platformState: state?.platformState ?? PlatformEnforcementState.NONE,
      policyVersion: state?.policyVersion ?? 0,
    };
  }

  async heartbeatForAgent(
    rawToken: string,
    input: {
      connectivity?: string;
      policyVersion?: number;
      batteryPercent?: number;
      location?: {
        lat: number;
        lng: number;
        accuracyMeters?: number;
        source: DeviceLocationSource;
        capturedAt: string;
      };
    },
  ) {
    const device = await this.requireAgentDevice(rawToken);
    const state = await this.prisma.devicePolicyState.findUnique({
      where: { deviceId: device.id },
    });
    const desired =
      state?.desiredPresentation ?? DesiredPresentation.NONE;

    if (input.location) {
      if (!DeviceLocationService.allowsLocation(desired)) {
        throw new BadRequestException('LOCATION_NOT_ALLOWED');
      }
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.device.update({
        where: { id: device.id },
        data: { lastHeartbeatAt: now },
      });
      if (input.location) {
        await this.locations.persistSample(tx, {
          tenantId: device.tenantId,
          deviceId: device.id,
          location: {
            lat: input.location.lat,
            lng: input.location.lng,
            accuracyMeters: input.location.accuracyMeters,
            source: input.location.source,
            capturedAt: new Date(input.location.capturedAt),
          },
        });
      }
      return row;
    });

    return {
      deviceId: device.id,
      lastHeartbeatAt: (updated.lastHeartbeatAt ?? now).toISOString(),
      policyVersion: input.policyVersion ?? state?.policyVersion ?? 0,
      connectivity: input.connectivity?.trim() || null,
      batteryPercent:
        typeof input.batteryPercent === 'number' ? input.batteryPercent : null,
      locationAccepted: Boolean(input.location),
    };
  }

  async pollForAgent(rawToken: string) {
    const device = await this.requireAgentDevice(rawToken);
    const now = new Date();
    const commands = await this.prisma.deviceCommand.findMany({
      where: {
        deviceId: device.id,
        tenantId: device.tenantId,
        status: { in: OPEN_STATUSES },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    const ids = commands.map((c) => c.id);
    if (ids.length > 0) {
      await this.prisma.deviceCommand.updateMany({
        where: {
          id: { in: ids },
          status: DeviceCommandStatus.QUEUED,
        },
        data: { status: DeviceCommandStatus.SENT },
      });
    }
    return {
      deviceId: device.id,
      commands: commands.map((c) => ({
        id: c.id,
        type: c.type,
        reason: c.reason,
        expiresAt: c.expiresAt.toISOString(),
      })),
    };
  }

  async ackForAgent(
    rawToken: string,
    commandId: string,
    input: {
      status:
        | typeof DeviceCommandStatus.ACKED_SUCCESS
        | typeof DeviceCommandStatus.ACKED_FAILED
        | typeof DeviceCommandStatus.UNSUPPORTED;
      platformState: PlatformEnforcementState;
      resultCode?: string;
    },
  ) {
    const device = await this.requireAgentDevice(rawToken);
    const command = await this.prisma.deviceCommand.findFirst({
      where: {
        id: commandId,
        deviceId: device.id,
        tenantId: device.tenantId,
      },
    });
    if (!command) {
      throw new NotFoundException('COMMAND_NOT_FOUND');
    }
    if (
      command.status === DeviceCommandStatus.ACKED_SUCCESS ||
      command.status === DeviceCommandStatus.ACKED_FAILED ||
      command.status === DeviceCommandStatus.UNSUPPORTED
    ) {
      return command;
    }

    const desired = desiredPresentationForCommand(command.type);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deviceCommand.update({
        where: { id: command.id },
        data: {
          status: input.status,
          resultCode: input.resultCode?.trim() || null,
          ackedAt: new Date(),
        },
      });
      await tx.devicePolicyState.upsert({
        where: { deviceId: device.id },
        create: {
          tenantId: device.tenantId,
          deviceId: device.id,
          desiredPresentation: desired,
          platformState: input.platformState,
          policyVersion: 1,
        },
        update: {
          desiredPresentation: desired,
          platformState: input.platformState,
        },
      });
      return updated;
    });
  }

  async registerPushTokenForAgent(
    rawToken: string,
    input: { token: string },
  ) {
    const fcmToken = input.token?.trim();
    if (!fcmToken) {
      throw new BadRequestException('FCM_TOKEN_REQUIRED');
    }
    const device = await this.requireAgentDevice(rawToken);
    const stamped = new Date();
    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        fcmToken,
        fcmTokenUpdatedAt: stamped,
      },
    });
    return {
      deviceId: device.id,
      fcmTokenUpdatedAt: (updated.fcmTokenUpdatedAt ?? stamped).toISOString(),
    };
  }

  private async requireAgentDevice(rawToken: string) {
    const token = rawToken?.trim();
    if (!token) {
      throw new ForbiddenException('DEVICE_AGENT_TOKEN_REQUIRED');
    }
    const device = await this.prisma.device.findFirst({
      where: { agentTokenHash: hashDeviceAgentToken(token) },
    });
    if (!device) {
      throw new ForbiddenException('DEVICE_AGENT_TOKEN_INVALID');
    }
    return device;
  }
}
