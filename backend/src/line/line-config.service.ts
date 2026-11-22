import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LineChannelStatus,
  LineNotifyType,
  PlatformRole,
} from '@prisma/client';
import { hasPermission } from '../common/authz/permissions';
import { LINE_CREDENTIALS_CRYPTO } from '../common/notifications/notifications.module';
import { LineCredentialsCrypto } from '../common/notifications/line-credentials-crypto';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { DEFAULT_LINE_TEMPLATES } from './line-template';

@Injectable()
export class LineConfigService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LINE_CREDENTIALS_CRYPTO)
    private readonly credentialsCrypto: LineCredentialsCrypto,
  ) {}

  async upsert(
    ctx: TenantContext,
    input: { channelId: string; channelSecret: string; accessToken: string },
  ) {
    this.requirePerm(ctx, 'line.config');
    const tenantId = this.requireTenantId(ctx);

    const channelSecretEnc = this.credentialsCrypto.encrypt(input.channelSecret);
    const accessTokenEnc = this.credentialsCrypto.encrypt(input.accessToken);

    const config = await this.prisma.lineChannelConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        channelId: input.channelId,
        channelSecretEnc,
        accessTokenEnc,
        status: LineChannelStatus.CONNECTED,
        lastError: null,
      },
      update: {
        channelId: input.channelId,
        channelSecretEnc,
        accessTokenEnc,
        status: LineChannelStatus.CONNECTED,
        lastError: null,
      },
    });

    await this.ensureDefaultTemplates(tenantId);
    return this.toPublic(config);
  }

  async get(ctx: TenantContext) {
    this.requirePerm(ctx, 'line.config');
    const tenantId = this.requireTenantId(ctx);
    const config = await this.prisma.lineChannelConfig.findUnique({
      where: { tenantId },
    });
    if (!config) {
      return {
        status: LineChannelStatus.DISCONNECTED,
        channelId: null,
        maskedSecret: null,
        lastWebhookAt: null,
        lastError: null,
      };
    }
    return this.toPublic(config);
  }

  async disconnect(ctx: TenantContext) {
    this.requirePerm(ctx, 'line.config');
    const tenantId = this.requireTenantId(ctx);
    const existing = await this.prisma.lineChannelConfig.findUnique({
      where: { tenantId },
    });
    if (!existing) {
      throw new NotFoundException('LINE config not found.');
    }
    const wiped = this.credentialsCrypto.encrypt('disconnected');
    const config = await this.prisma.lineChannelConfig.update({
      where: { tenantId },
      data: {
        status: LineChannelStatus.DISCONNECTED,
        channelSecretEnc: wiped,
        accessTokenEnc: wiped,
        lastError: null,
      },
    });
    return this.toPublic(config);
  }

  async getDecryptedSecrets(tenantId: string): Promise<{
    channelId: string;
    channelSecret: string;
    accessToken: string;
    status: LineChannelStatus;
  } | null> {
    const config = await this.prisma.lineChannelConfig.findUnique({
      where: { tenantId },
    });
    if (!config || config.status !== LineChannelStatus.CONNECTED) {
      return null;
    }
    return {
      channelId: config.channelId,
      channelSecret: this.credentialsCrypto.decrypt(config.channelSecretEnc),
      accessToken: this.credentialsCrypto.decrypt(config.accessTokenEnc),
      status: config.status,
    };
  }

  async touchWebhook(tenantId: string) {
    await this.prisma.lineChannelConfig.updateMany({
      where: { tenantId },
      data: { lastWebhookAt: new Date(), lastError: null },
    });
  }

  async markError(tenantId: string, message: string) {
    await this.prisma.lineChannelConfig.updateMany({
      where: { tenantId },
      data: { status: LineChannelStatus.ERROR, lastError: message.slice(0, 500) },
    });
  }

  private async ensureDefaultTemplates(tenantId: string) {
    for (const type of Object.values(LineNotifyType)) {
      const body = DEFAULT_LINE_TEMPLATES[type];
      if (!body) continue;
      await this.prisma.lineNotificationTemplate.upsert({
        where: { tenantId_type: { tenantId, type } },
        create: { tenantId, type, body, enabled: true },
        update: {},
      });
    }
  }

  private toPublic(config: {
    channelId: string;
    status: LineChannelStatus;
    lastWebhookAt: Date | null;
    lastError: string | null;
  }) {
    return {
      status: config.status,
      channelId: config.channelId,
      maskedSecret: '****',
      lastWebhookAt: config.lastWebhookAt,
      lastError: config.lastError,
    };
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private requirePerm(
    ctx: TenantContext,
    permission: 'line.config' | 'line.link' | 'line.notify',
  ) {
    if (!hasPermission(ctx.role as PlatformRole | null, permission)) {
      throw new ForbiddenException(`Missing permission ${permission}.`);
    }
  }
}
