import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsentType,
  LineDeliveryStatus,
  LineLinkStatus,
  LineNotifyType,
  PlatformRole,
} from '@prisma/client';
import { Inject } from '@nestjs/common';
import { hasPermission } from '../common/authz/permissions';
import {
  NOTIFICATION_CHANNEL,
  NotificationChannelPort,
} from '../common/notifications/notification-channel.port';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { LineConfigService } from './line-config.service';
import { LineInstallmentQueryService } from './line-installment-query.service';
import { renderLineTemplate } from './line-template';

@Injectable()
export class LineNotifyService {
  private readonly logger = new Logger(LineNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineConfig: LineConfigService,
    private readonly installmentQuery: LineInstallmentQueryService,
    @Inject(NOTIFICATION_CHANNEL)
    private readonly channel: NotificationChannelPort,
  ) {}

  async onVerifiedPayment(params: {
    tenantId: string;
    contractId: string;
    paymentTransactionId: string;
    amount: string;
  }): Promise<void> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: params.contractId, tenantId: params.tenantId },
      include: { customer: true },
    });
    if (!contract) return;

    await this.deliver({
      tenantId: params.tenantId,
      customerId: contract.customerId,
      contractId: params.contractId,
      type: LineNotifyType.PAYMENT_CONFIRMATION,
      idempotencyKey: `payconfirm:${params.paymentTransactionId}`,
      vars: {
        customerName: contract.customer.fullName,
        contractId: contract.id,
        amount: params.amount,
        outstandingBalance: (
          await this.installmentQuery.summarizeForCustomer(
            params.tenantId,
            contract.customerId,
            contract.id,
          )
        ).selected?.outstandingBalance ?? '0.00',
        merchantName: await this.merchantName(params.tenantId),
        dueDate: '',
        contractStatus: contract.status,
      },
    });
  }

  async sendReminder(ctx: TenantContext, contractId: string, idempotencyKey: string) {
    this.requirePerm(ctx, 'line.notify');
    const tenantId = this.requireTenantId(ctx);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      include: { customer: true },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }
    const summary = await this.installmentQuery.summarizeForCustomer(
      tenantId,
      contract.customerId,
      contract.id,
    );
    const selected = summary.selected;
    if (!selected) {
      throw new NotFoundException('No schedule for contract.');
    }

    return this.deliver({
      tenantId,
      customerId: contract.customerId,
      contractId,
      type: LineNotifyType.PAYMENT_REMINDER,
      idempotencyKey: `reminder:${idempotencyKey}`,
      vars: {
        customerName: contract.customer.fullName,
        contractId: contract.id,
        amount: selected.nextDueAmount ?? '0.00',
        dueDate: selected.nextDueDate ?? '-',
        outstandingBalance: selected.outstandingBalance,
        merchantName: await this.merchantName(tenantId),
        contractStatus: contract.status,
      },
    });
  }

  private async deliver(params: {
    tenantId: string;
    customerId: string;
    contractId: string | null;
    type: LineNotifyType;
    idempotencyKey: string;
    vars: Record<string, string>;
  }) {
    const existing = await this.prisma.lineNotificationDelivery.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: params.tenantId,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });
    if (existing) {
      return { data: existing, replay: true };
    }

    const link = await this.prisma.lineCustomerLink.findFirst({
      where: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        status: LineLinkStatus.ACTIVE,
      },
    });
    const consent = await this.prisma.consent.findFirst({
      where: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        type: ConsentType.LINE_MESSAGING,
        revokedAt: null,
      },
    });

    if (!link || !consent) {
      const skipped = await this.prisma.lineNotificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          contractId: params.contractId ?? undefined,
          type: params.type,
          status: LineDeliveryStatus.SKIPPED,
          idempotencyKey: params.idempotencyKey,
          errorMessage: !link ? 'no_active_line_link' : 'no_line_messaging_consent',
        },
      });
      return { data: skipped, replay: false };
    }

    const template = await this.prisma.lineNotificationTemplate.findUnique({
      where: {
        tenantId_type: { tenantId: params.tenantId, type: params.type },
      },
    });
    if (!template || !template.enabled) {
      const skipped = await this.prisma.lineNotificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          contractId: params.contractId ?? undefined,
          type: params.type,
          status: LineDeliveryStatus.SKIPPED,
          idempotencyKey: params.idempotencyKey,
          errorMessage: 'template_disabled_or_missing',
        },
      });
      return { data: skipped, replay: false };
    }

    const secrets = await this.lineConfig.getDecryptedSecrets(params.tenantId);
    if (!secrets) {
      const failed = await this.prisma.lineNotificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          contractId: params.contractId ?? undefined,
          type: params.type,
          status: LineDeliveryStatus.FAILED,
          idempotencyKey: params.idempotencyKey,
          errorMessage: 'line_not_connected',
        },
      });
      return { data: failed, replay: false };
    }

    const bodyRendered = renderLineTemplate(template.body, params.vars);
    try {
      const sent = await this.channel.sendTextMessage({
        accessToken: secrets.accessToken,
        toLineUserId: link.lineUserId,
        text: bodyRendered,
      });
      const row = await this.prisma.lineNotificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          contractId: params.contractId ?? undefined,
          type: params.type,
          status: LineDeliveryStatus.SENT,
          idempotencyKey: params.idempotencyKey,
          providerMessageId: sent.providerMessageId,
          bodyRendered,
        },
      });
      return { data: row, replay: false };
    } catch (error: unknown) {
      this.logger.error(
        `LINE notify failed key=${params.idempotencyKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      const failed = await this.prisma.lineNotificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          contractId: params.contractId ?? undefined,
          type: params.type,
          status: LineDeliveryStatus.FAILED,
          idempotencyKey: params.idempotencyKey,
          errorMessage: error instanceof Error ? error.message : 'send_failed',
          bodyRendered,
        },
      });
      return { data: failed, replay: false };
    }
  }

  private async merchantName(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return tenant?.name ?? 'Merchant';
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private requirePerm(ctx: TenantContext, permission: 'line.notify') {
    if (!hasPermission(ctx.role as PlatformRole | null, permission)) {
      throw new ForbiddenException(`Missing permission ${permission}.`);
    }
  }
}
