import { UnauthorizedException } from '@nestjs/common';
import { signLineWebhook } from '../common/notifications/sandbox-line.adapter';
import { LineWebhookService } from './line-webhook.service';

describe('LineWebhookService', () => {
  const prisma = {
    lineWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const lineConfig = {
    getDecryptedSecrets: jest.fn(),
    markError: jest.fn(),
    touchWebhook: jest.fn(),
  };
  const linking = {
    consumeLinkToken: jest.fn(),
    findActiveByLineUser: jest.fn(),
  };
  const installmentQuery = {
    summarizeForCustomer: jest.fn(),
    formatBalanceReply: jest.fn(),
    formatNextReply: jest.fn(),
    formatHistoryReply: jest.fn(),
  };
  const channel = {
    verifyWebhookSignature: jest.fn(),
    sendTextMessage: jest.fn().mockResolvedValue({ providerMessageId: 'm1' }),
  };

  const service = new LineWebhookService(
    prisma as never,
    lineConfig as never,
    linking as never,
    installmentQuery as never,
    channel as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid signature', async () => {
    lineConfig.getDecryptedSecrets.mockResolvedValue({
      channelId: 'c',
      channelSecret: 'secret',
      accessToken: 'tok',
      status: 'CONNECTED',
    });
    channel.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handle('tenant-1', Buffer.from('{}'), {
        'x-line-signature': 'bad',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(lineConfig.markError).toHaveBeenCalled();
  });

  it('skips reprocessing when providerEventId exists', async () => {
    const body = Buffer.from(
      JSON.stringify({
        events: [
          {
            type: 'message',
            webhookEventId: 'evt-1',
            source: { userId: 'U1' },
            message: { id: 'm1', type: 'text', text: 'HELP' },
          },
        ],
      }),
    );
    lineConfig.getDecryptedSecrets.mockResolvedValue({
      channelId: 'c',
      channelSecret: 'secret',
      accessToken: 'tok',
      status: 'CONNECTED',
    });
    channel.verifyWebhookSignature.mockImplementation(
      (headers: Record<string, string>, raw: Buffer, secret: string) =>
        headers['x-line-signature'] === signLineWebhook(raw, secret),
    );
    prisma.lineWebhookEvent.findUnique.mockResolvedValue({ id: 'existing' });

    const result = await service.handle('tenant-1', body, {
      'x-line-signature': signLineWebhook(body, 'secret'),
    });

    expect(result.data.results[0].replay).toBe(true);
    expect(prisma.lineWebhookEvent.create).not.toHaveBeenCalled();
    expect(channel.sendTextMessage).not.toHaveBeenCalled();
  });
});
