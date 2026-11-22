import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  NOTIFICATION_CHANNEL,
  NotificationChannelPort,
} from '../common/notifications/notification-channel.port';
import { PrismaService } from '../prisma/prisma.service';
import { LineConfigService } from './line-config.service';
import { LineInstallmentQueryService } from './line-installment-query.service';
import { LineLinkingService } from './line-linking.service';

type LineEvent = {
  type: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { id?: string; type?: string; text?: string };
};

type LineWebhookBody = {
  destination?: string;
  events?: LineEvent[];
};

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineConfig: LineConfigService,
    private readonly linking: LineLinkingService,
    private readonly installmentQuery: LineInstallmentQueryService,
    @Inject(NOTIFICATION_CHANNEL)
    private readonly channel: NotificationChannelPort,
  ) {}

  async handle(
    tenantId: string,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const secrets = await this.lineConfig.getDecryptedSecrets(tenantId);
    if (!secrets) {
      throw new UnauthorizedException('LINE channel not connected for tenant.');
    }

    const flatHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') flatHeaders[k] = v;
      else if (Array.isArray(v) && v[0]) flatHeaders[k] = v[0];
    }

    if (
      !this.channel.verifyWebhookSignature(
        flatHeaders,
        rawBody,
        secrets.channelSecret,
      )
    ) {
      await this.lineConfig.markError(tenantId, 'invalid_webhook_signature');
      throw new UnauthorizedException('Invalid LINE webhook signature.');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as LineWebhookBody;
    const events = body.events ?? [];
    const results: Array<{ providerEventId: string; replay?: boolean; reply?: string }> =
      [];

    for (const event of events) {
      const providerEventId =
        event.webhookEventId ||
        event.message?.id ||
        `${event.type}:${event.source?.userId ?? 'unknown'}:${rawBody.length}`;

      const existing = await this.prisma.lineWebhookEvent.findUnique({
        where: { providerEventId },
      });
      if (existing) {
        results.push({ providerEventId, replay: true });
        continue;
      }

      await this.prisma.lineWebhookEvent.create({
        data: {
          tenantId,
          providerEventId,
          eventType: event.type,
          rawJson: event as unknown as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });

      const reply = await this.dispatch(tenantId, event, secrets.accessToken);
      results.push({ providerEventId, reply: reply ?? undefined });
    }

    await this.lineConfig.touchWebhook(tenantId);
    return { data: { processed: results.length, results } };
  }

  private async dispatch(
    tenantId: string,
    event: LineEvent,
    accessToken: string,
  ): Promise<string | null> {
    const lineUserId = event.source?.userId;
    if (!lineUserId) return null;

    if (event.type === 'message' && event.message?.type === 'text') {
      const text = (event.message.text ?? '').trim();
      const linkMatch = /^LINK\s+(\S+)/i.exec(text);
      if (linkMatch) {
        try {
          await this.linking.consumeLinkToken({
            tenantId,
            lineUserId,
            rawToken: linkMatch[1],
          });
          await this.reply(accessToken, lineUserId, 'เชื่อมต่อ LINE กับบัญชีลูกค้าสำเร็จแล้ว');
          return 'linked';
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? error.message : 'เชื่อมต่อไม่สำเร็จ';
          await this.reply(accessToken, lineUserId, msg);
          return 'link_failed';
        }
      }

      const link = await this.linking.findActiveByLineUser(tenantId, lineUserId);
      if (!link) {
        await this.reply(
          accessToken,
          lineUserId,
          'ยังไม่ได้เชื่อมบัญชี ส่ง LINK <token> จากร้าน หรือขอรหัสเชื่อมจากพนักงาน',
        );
        return 'unlinked';
      }

      const upper = text.toUpperCase();
      if (upper === 'HELP' || text === 'ช่วยเหลือ') {
        await this.reply(
          accessToken,
          lineUserId,
          'คำสั่ง: BALANCE / ยอด, NEXT / งวดถัดไป, HISTORY / ประวัติ, HELP',
        );
        return 'help';
      }

      // BALANCE <uuid> or SELECT <uuid>
      let explicitContract: string | undefined;
      const balanceWithId = /^BALANCE\s+(\S+)/i.exec(text);
      if (balanceWithId) explicitContract = balanceWithId[1];
      const selectOnly = /^SELECT\s+(\S+)/i.exec(text);
      if (selectOnly) explicitContract = selectOnly[1];

      const { contracts, selected } =
        await this.installmentQuery.summarizeForCustomer(
          tenantId,
          link.customerId,
          explicitContract,
        );

      if (
        upper === 'BALANCE' ||
        text === 'ยอด' ||
        balanceWithId ||
        selectOnly
      ) {
        const replyText = selected
          ? this.installmentQuery.formatBalanceReply([selected])
          : this.installmentQuery.formatBalanceReply(contracts);
        await this.reply(accessToken, lineUserId, replyText);
        return 'balance';
      }

      if (upper === 'NEXT' || text === 'งวดถัดไป') {
        if (!selected && contracts.length !== 1) {
          await this.reply(
            accessToken,
            lineUserId,
            this.installmentQuery.formatBalanceReply(contracts),
          );
          return 'next_pick';
        }
        const s = selected ?? contracts[0];
        await this.reply(accessToken, lineUserId, this.installmentQuery.formatNextReply(s));
        return 'next';
      }

      if (upper === 'HISTORY' || text === 'ประวัติ') {
        if (!selected && contracts.length !== 1) {
          await this.reply(
            accessToken,
            lineUserId,
            this.installmentQuery.formatBalanceReply(contracts),
          );
          return 'history_pick';
        }
        const s = selected ?? contracts[0];
        await this.reply(
          accessToken,
          lineUserId,
          this.installmentQuery.formatHistoryReply(s),
        );
        return 'history';
      }

      await this.reply(
        accessToken,
        lineUserId,
        'ไม่เข้าใจคำสั่ง ส่ง HELP เพื่อดูรายการ',
      );
      return 'unknown';
    }

    return null;
  }

  private async reply(accessToken: string, toLineUserId: string, text: string) {
    try {
      await this.channel.sendTextMessage({ accessToken, toLineUserId, text });
    } catch (error: unknown) {
      this.logger.error(
        'LINE reply failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
