import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConsentType,
  LineNotificationKind,
  LineNotificationStatus,
  Prisma,
} from '@prisma/client';
import {
  createCipheriv,
  createHash,
  createHmac,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_LINK_REQUESTS_PER_HOUR = 5;
const MAX_DELIVERY_ATTEMPTS = 5;

type LineWebhookEvent = {
  webhookEventId?: string;
  type?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

type ClaimedNotification = {
  id: string;
  tenantId: string;
  customerId: string;
  kind: LineNotificationKind;
  payload: Record<string, unknown>;
  attempts: number;
};

@Injectable()
export class LineNotificationsService {
  private readonly logger = new Logger(LineNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async configureTenant(
    ctx: TenantContext,
    input: {
      channelAccessToken: string;
      channelSecret: string;
      officialAccountUrl: string;
    },
  ) {
    const tenantId = this.requireTenantId(ctx);
    const key = this.encryptionKey();
    await this.verifyChannelAccessToken(input.channelAccessToken);
    const integration = await this.prisma.tenantLineIntegration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        channelAccessTokenEncrypted: this.encrypt(
          input.channelAccessToken,
          key,
        ),
        channelSecretEncrypted: this.encrypt(input.channelSecret, key),
        officialAccountUrl: input.officialAccountUrl,
      },
      update: {
        channelAccessTokenEncrypted: this.encrypt(
          input.channelAccessToken,
          key,
        ),
        channelSecretEncrypted: this.encrypt(input.channelSecret, key),
        officialAccountUrl: input.officialAccountUrl,
        enabled: true,
      },
      select: { enabled: true, officialAccountUrl: true },
    });

    return {
      configured: true,
      enabled: integration.enabled,
      officialAccountUrl: integration.officialAccountUrl,
      webhookUrl: this.webhookUrl(ctx.tenantId!),
    };
  }

  async getTenantConfiguration(ctx: TenantContext) {
    const tenantId = this.requireTenantId(ctx);
    const integration = await this.prisma.tenantLineIntegration.findUnique({
      where: { tenantId },
      select: { enabled: true, officialAccountUrl: true },
    });
    return {
      configured: Boolean(integration),
      enabled: integration?.enabled ?? false,
      officialAccountUrl: integration?.officialAccountUrl ?? null,
      webhookUrl: this.webhookUrl(ctx.tenantId!),
    };
  }

  async disableTenant(ctx: TenantContext) {
    const tenantId = this.requireTenantId(ctx);
    await this.prisma.tenantLineIntegration.updateMany({
      where: { tenantId },
      data: { enabled: false },
    });
    await this.prisma.lineNotificationOutbox.updateMany({
      where: {
        tenantId,
        status: LineNotificationStatus.PENDING,
      },
      data: {
        status: LineNotificationStatus.CANCELLED,
        lockedUntil: null,
      },
    });
    return { disabled: true, enabled: false };
  }

  async getCustomerLink(ctx: TenantContext) {
    const { tenantId, customerId } = this.requireCustomerContext(ctx);
    const [link, consent, integration] = await Promise.all([
      this.prisma.customerLineLink.findFirst({
        where: { tenantId, customerId, revokedAt: null },
        select: { linkedAt: true },
      }),
      this.prisma.consent.findFirst({
        where: {
          tenantId,
          customerId,
          type: ConsentType.LINE_NOTIFICATIONS,
          revokedAt: null,
        },
        select: { id: true },
      }),
      this.prisma.tenantLineIntegration.findUnique({
        where: { tenantId },
        select: { enabled: true, officialAccountUrl: true },
      }),
    ]);

    return {
      linked: Boolean(link && consent),
      linkedAt: link?.linkedAt ?? null,
      available: integration?.enabled ?? false,
      officialAccountUrl: integration?.enabled
        ? integration.officialAccountUrl
        : null,
    };
  }

  async requestCustomerLink(ctx: TenantContext, consent: boolean) {
    if (consent !== true) {
      throw new BadRequestException(
        'Consent is required to enable LINE notifications.',
      );
    }
    const { tenantId, customerId } = this.requireCustomerContext(ctx);
    const integration = await this.prisma.tenantLineIntegration.findUnique({
      where: { tenantId },
    });
    if (!integration?.enabled) {
      throw new ServiceUnavailableException(
        'LINE notifications are not configured for this merchant.',
      );
    }

    const linked = await this.prisma.customerLineLink.findFirst({
      where: { tenantId, customerId, revokedAt: null },
    });
    if (linked) {
      throw new ConflictException('A LINE account is already linked.');
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.lineLinkChallenge.count({
      where: { tenantId, customerId, createdAt: { gte: since } },
    });
    if (recent >= MAX_LINK_REQUESTS_PER_HOUR) {
      throw new ConflictException('Too many link codes requested. Try later.');
    }

    const code = randomBytes(6).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
    await this.prisma.lineLinkChallenge.create({
      data: {
        tenantId,
        customerId,
        codeHash: this.hashLinkCode(tenantId, code),
        expiresAt,
      },
    });

    return {
      code,
      command: `LINK ${code}`,
      expiresAt,
      officialAccountUrl: integration.officialAccountUrl,
    };
  }

  async unlinkCustomer(ctx: TenantContext) {
    const { tenantId, customerId } = this.requireCustomerContext(ctx);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.customerLineLink.updateMany({
        where: { tenantId, customerId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.consent.updateMany({
        where: {
          tenantId,
          customerId,
          type: ConsentType.LINE_NOTIFICATIONS,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await tx.lineNotificationOutbox.updateMany({
        where: {
          tenantId,
          customerId,
          status: LineNotificationStatus.PENDING,
        },
        data: {
          status: LineNotificationStatus.CANCELLED,
          lockedUntil: null,
        },
      });
    });
    return { linked: false };
  }

  async handleWebhook(
    tenantSlug: string,
    signature: string | undefined,
    rawBody: Buffer,
  ) {
    const integration = await this.prisma.tenantLineIntegration.findFirst({
      where: { tenantId: tenantSlug, enabled: true },
      select: {
        tenantId: true,
        channelSecretEncrypted: true,
      },
    });
    if (!integration) {
      throw new NotFoundException('LINE integration not found.');
    }
    const secret = this.decrypt(
      integration.channelSecretEncrypted,
      this.encryptionKey(),
    );
    if (!signature || !this.verifySignature(rawBody, signature, secret)) {
      throw new ForbiddenException('Invalid LINE webhook signature.');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as unknown;
    } catch {
      throw new BadRequestException('Invalid LINE webhook body.');
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new BadRequestException('Invalid LINE webhook body.');
    }
    const events = (payload as { events?: unknown }).events;
    if (events !== undefined && !Array.isArray(events)) {
      throw new BadRequestException('Invalid LINE webhook events.');
    }

    for (const value of (events ?? []) as unknown[]) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        continue;
      }
      const event = value as LineWebhookEvent;
      if (!event.webhookEventId || !event.source?.userId) {
        continue;
      }
      if (event.type === 'unfollow') {
        await this.processLineUnfollow(
          integration.tenantId,
          event.webhookEventId,
          event.source.userId,
        );
        continue;
      }
      if (
        event.type !== 'message' ||
        event.message?.type !== 'text' ||
        !event.message.text
      ) {
        continue;
      }
      await this.processLineMessage(
        integration.tenantId,
        event.webhookEventId,
        event.source.userId,
        event.message.text.trim(),
      );
    }
    return { accepted: true };
  }

  async enqueueScheduledReminders(): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO line_notification_outbox (
        id, tenant_id, customer_id, kind, status, idempotency_key,
        payload_json, attempts, next_attempt_at, created_at, updated_at
      )
      SELECT
        gen_random_uuid(), item.tenant_id, contract.customer_id,
        'DUE_REMINDER'::"LineNotificationKind",
        'PENDING'::"LineNotificationStatus",
        'due:' || item.id::text,
        jsonb_build_object('seq', item.seq, 'dueDate', item.due_date::text),
        0, NOW(), NOW(), NOW()
      FROM payment_schedule_items item
      JOIN contracts contract
        ON contract.id = item.contract_id AND contract.tenant_id = item.tenant_id
      WHERE contract.status = 'ACTIVE'
        AND item.status <> 'PAID'
        AND item.due_date = ((NOW() AT TIME ZONE 'Asia/Bangkok')::date + 1)
        AND EXISTS (
          SELECT 1 FROM customer_line_links link
          WHERE link.tenant_id = contract.tenant_id
            AND link.customer_id = contract.customer_id
            AND link.revoked_at IS NULL
        )
        AND EXISTS (
          SELECT 1 FROM consents consent
          WHERE consent.tenant_id = contract.tenant_id
            AND consent.customer_id = contract.customer_id
            AND consent.type = 'LINE_NOTIFICATIONS'
            AND consent.revoked_at IS NULL
        )
        AND EXISTS (
          SELECT 1 FROM tenant_line_integrations integration
          WHERE integration.tenant_id = contract.tenant_id
            AND integration.enabled
        )
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    `;

    await this.prisma.$executeRaw`
      INSERT INTO line_notification_outbox (
        id, tenant_id, customer_id, kind, status, idempotency_key,
        payload_json, attempts, next_attempt_at, created_at, updated_at
      )
      SELECT
        gen_random_uuid(), item.tenant_id, contract.customer_id,
        'OVERDUE_REMINDER'::"LineNotificationKind",
        'PENDING'::"LineNotificationStatus",
        'overdue:' || item.id::text,
        jsonb_build_object('seq', item.seq, 'dueDate', item.due_date::text),
        0, NOW(), NOW(), NOW()
      FROM payment_schedule_items item
      JOIN contracts contract
        ON contract.id = item.contract_id AND contract.tenant_id = item.tenant_id
      WHERE contract.status = 'ACTIVE'
        AND item.status <> 'PAID'
        AND item.due_date = ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1)
        AND EXISTS (
          SELECT 1 FROM customer_line_links link
          WHERE link.tenant_id = contract.tenant_id
            AND link.customer_id = contract.customer_id
            AND link.revoked_at IS NULL
        )
        AND EXISTS (
          SELECT 1 FROM consents consent
          WHERE consent.tenant_id = contract.tenant_id
            AND consent.customer_id = contract.customer_id
            AND consent.type = 'LINE_NOTIFICATIONS'
            AND consent.revoked_at IS NULL
        )
        AND EXISTS (
          SELECT 1 FROM tenant_line_integrations integration
          WHERE integration.tenant_id = contract.tenant_id
            AND integration.enabled
        )
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    `;
  }

  async dispatchPendingNotifications(): Promise<void> {
    const claimed = await this.prisma.$transaction(
      (tx) =>
        tx.$queryRaw<ClaimedNotification[]>`
        WITH pending AS (
          SELECT id
          FROM line_notification_outbox
          WHERE status = 'PENDING'
            AND next_attempt_at <= NOW()
            AND (locked_until IS NULL OR locked_until < NOW())
            AND attempts < ${MAX_DELIVERY_ATTEMPTS}
          ORDER BY next_attempt_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 25
        )
        UPDATE line_notification_outbox notification
        SET attempts = notification.attempts + 1,
            locked_until = NOW() + INTERVAL '2 minutes',
            updated_at = NOW()
        FROM pending
        WHERE notification.id = pending.id
        RETURNING notification.id,
          notification.tenant_id AS "tenantId",
          notification.customer_id AS "customerId",
          notification.kind,
          notification.payload_json AS payload,
          notification.attempts
      `,
    );

    for (const notification of claimed) {
      await this.deliver(notification);
    }
  }

  private async deliver(notification: ClaimedNotification): Promise<void> {
    const [integration, link, consent] = await Promise.all([
      this.prisma.tenantLineIntegration.findUnique({
        where: { tenantId: notification.tenantId },
      }),
      this.prisma.customerLineLink.findFirst({
        where: {
          tenantId: notification.tenantId,
          customerId: notification.customerId,
          revokedAt: null,
        },
      }),
      this.prisma.consent.findFirst({
        where: {
          tenantId: notification.tenantId,
          customerId: notification.customerId,
          type: ConsentType.LINE_NOTIFICATIONS,
          revokedAt: null,
        },
      }),
    ]);
    if (!integration?.enabled || !link || !consent) {
      await this.prisma.lineNotificationOutbox.update({
        where: { id: notification.id },
        data: {
          status: LineNotificationStatus.CANCELLED,
          lockedUntil: null,
        },
      });
      return;
    }

    try {
      const token = this.decrypt(
        integration.channelAccessTokenEncrypted,
        this.encryptionKey(),
      );
      await this.pushText(
        token,
        link.lineUserId,
        this.formatMessage(notification.kind, notification.payload),
      );
      await this.prisma.lineNotificationOutbox.update({
        where: { id: notification.id },
        data: {
          status: LineNotificationStatus.SENT,
          sentAt: new Date(),
          lockedUntil: null,
          lastError: null,
        },
      });
    } catch (error) {
      const retryable = error instanceof LineApiError ? error.retryable : true;
      const canRetry =
        retryable && notification.attempts < MAX_DELIVERY_ATTEMPTS;
      const backoffMs = Math.min(
        60_000 * 2 ** (notification.attempts - 1),
        60 * 60 * 1000,
      );
      await this.prisma.lineNotificationOutbox.update({
        where: { id: notification.id },
        data: {
          status: canRetry
            ? LineNotificationStatus.PENDING
            : LineNotificationStatus.FAILED,
          nextAttemptAt: new Date(Date.now() + backoffMs),
          lockedUntil: null,
          lastError:
            error instanceof LineApiError
              ? `LINE API ${error.status}`
              : 'LINE delivery failed',
        },
      });
      this.logger.error(
        `LINE notification ${notification.id} failed${canRetry ? '; retry scheduled' : ''}.`,
      );
    }
  }

  private async pushText(token: string, lineUserId: string, text: string) {
    let response: Response;
    try {
      response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: 'text', text }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new LineApiError(0, true);
    }
    if (!response.ok) {
      throw new LineApiError(
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }
  }

  private async verifyChannelAccessToken(token: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException(
        'Unable to verify LINE channel access token.',
      );
    }
    if (!response.ok) {
      throw new BadRequestException('LINE channel access token was rejected.');
    }
  }

  private formatMessage(
    kind: LineNotificationKind,
    payload: Record<string, unknown>,
  ): string {
    const stopHint = 'พิมพ์ STOP เพื่อยกเลิกการแจ้งเตือน';
    switch (kind) {
      case LineNotificationKind.DUE_REMINDER: {
        const seq = Number(payload.seq);
        const dueDate =
          typeof payload.dueDate === 'string' ? payload.dueDate : '';
        return `แจ้งเตือน: งวดที่ ${seq} ครบกำหนดวันที่ ${dueDate} กรุณาเปิดแอปลูกค้าเพื่อตรวจสอบรายละเอียด ${stopHint}`;
      }
      case LineNotificationKind.OVERDUE_REMINDER:
        return `แจ้งเตือน: มีค่างวดเลยกำหนด กรุณาเปิดแอปลูกค้าเพื่อตรวจสอบรายละเอียด ${stopHint}`;
      case LineNotificationKind.PAYMENT_CONFIRMATION:
        return `ยืนยันการชำระเงินแล้ว กรุณาเปิดแอปลูกค้าเพื่อตรวจสอบสถานะ ${stopHint}`;
    }
  }

  private async processLineMessage(
    tenantId: string,
    eventId: string,
    lineUserId: string,
    text: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.lineWebhookEvent.createMany({
        data: [{ tenantId, eventId }],
        skipDuplicates: true,
      });
      if (inserted.count !== 1) {
        return;
      }

      if (/^STOP$/i.test(text)) {
        await this.revokeLineLink(tx, tenantId, lineUserId);
        return;
      }

      const match = /^LINK ([A-F0-9]{12})$/i.exec(text);
      if (!match) {
        return;
      }
      const challenge = await tx.lineLinkChallenge.findFirst({
        where: {
          tenantId,
          codeHash: this.hashLinkCode(tenantId, match[1].toUpperCase()),
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!challenge) {
        return;
      }

      const existingLineOwner = await tx.customerLineLink.findFirst({
        where: { tenantId, lineUserId, revokedAt: null },
        select: { customerId: true },
      });
      const existingCustomerLink = await tx.customerLineLink.findFirst({
        where: {
          tenantId,
          customerId: challenge.customerId,
          revokedAt: null,
        },
        select: { lineUserId: true },
      });
      if (
        (existingLineOwner &&
          existingLineOwner.customerId !== challenge.customerId) ||
        (existingCustomerLink && existingCustomerLink.lineUserId !== lineUserId)
      ) {
        return;
      }

      const consumed = await tx.lineLinkChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) {
        return;
      }
      await tx.customerLineLink.upsert({
        where: { customerId: challenge.customerId },
        create: {
          tenantId,
          customerId: challenge.customerId,
          lineUserId,
        },
        update: {
          lineUserId,
          linkedAt: new Date(),
          revokedAt: null,
        },
      });
      await tx.consent.create({
        data: {
          tenantId,
          customerId: challenge.customerId,
          type: ConsentType.LINE_NOTIFICATIONS,
          version: 'line-notifications-v1',
          grantedAt: new Date(),
        },
      });
    });
  }

  private async processLineUnfollow(
    tenantId: string,
    eventId: string,
    lineUserId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.lineWebhookEvent.createMany({
        data: [{ tenantId, eventId }],
        skipDuplicates: true,
      });
      if (inserted.count === 1) {
        await this.revokeLineLink(tx, tenantId, lineUserId);
      }
    });
  }

  private async revokeLineLink(
    tx: Prisma.TransactionClient,
    tenantId: string,
    lineUserId: string,
  ): Promise<void> {
    const link = await tx.customerLineLink.findFirst({
      where: { tenantId, lineUserId, revokedAt: null },
      select: { customerId: true },
    });
    if (!link) {
      return;
    }
    const now = new Date();
    await tx.customerLineLink.updateMany({
      where: { tenantId, customerId: link.customerId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.consent.updateMany({
      where: {
        tenantId,
        customerId: link.customerId,
        type: ConsentType.LINE_NOTIFICATIONS,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    await tx.lineNotificationOutbox.updateMany({
      where: {
        tenantId,
        customerId: link.customerId,
        status: LineNotificationStatus.PENDING,
      },
      data: {
        status: LineNotificationStatus.CANCELLED,
        lockedUntil: null,
      },
    });
  }

  private verifySignature(
    rawBody: Buffer,
    signature: string,
    channelSecret: string,
  ): boolean {
    const expected = createHmac('sha256', channelSecret)
      .update(rawBody)
      .digest();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) {
      return false;
    }
    const actual = Buffer.from(signature, 'base64');
    return (
      actual.toString('base64') === signature &&
      actual.length === expected.length &&
      timingSafeEqual(actual, expected)
    );
  }

  private hashLinkCode(tenantId: string, code: string): string {
    return createHmac('sha256', this.encryptionKey())
      .update(`${tenantId}:${code}`)
      .digest('hex');
  }

  private encrypt(value: string, secret: string): string {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(secret).digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  private decrypt(value: string, secret: string): string {
    const [ivPart, tagPart, encryptedPart] = value.split(':');
    if (!ivPart || !tagPart || !encryptedPart) {
      throw new Error('Invalid encrypted LINE credential format.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      createHash('sha256').update(secret).digest(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private encryptionKey(): string {
    const key = this.config.get<string>('LINE_CREDENTIALS_ENCRYPTION_KEY');
    if (!key || key.length < 32) {
      throw new ServiceUnavailableException(
        'LINE credentials encryption is not configured.',
      );
    }
    return key;
  }

  private webhookUrl(tenantId: string): string {
    const baseUrl = this.config.get<string>(
      'PUBLIC_API_BASE_URL',
      'http://localhost:3000',
    );
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/line/${tenantId}`;
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }
    return ctx.tenantId;
  }

  private requireCustomerContext(ctx: TenantContext): {
    tenantId: string;
    customerId: string;
  } {
    if (!ctx.tenantId || !ctx.customerId) {
      throw new ForbiddenException('Customer context is required.');
    }
    return { tenantId: ctx.tenantId, customerId: ctx.customerId };
  }
}

class LineApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super('LINE push request failed.');
  }
}
