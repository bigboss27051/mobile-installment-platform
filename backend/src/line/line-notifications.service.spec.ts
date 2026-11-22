import { ForbiddenException } from '@nestjs/common';
import { ConsentType } from '@prisma/client';
import { createCipheriv, createHash, createHmac } from 'crypto';
import { LineNotificationsService } from './line-notifications.service';

describe('LineNotificationsService', () => {
  const encryptionKey = 'test-line-credentials-encryption-key';
  const channelSecret = 'test-line-channel-secret';
  const tenantId = 'tenant-1';
  const customerId = 'customer-1';
  const code = 'A1B2C3D4E5F6';

  const tx = {
    lineWebhookEvent: { createMany: jest.fn() },
    lineLinkChallenge: { findFirst: jest.fn(), updateMany: jest.fn() },
    customerLineLink: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    consent: { create: jest.fn(), updateMany: jest.fn() },
    lineNotificationOutbox: { updateMany: jest.fn() },
  };
  const prisma = {
    tenantLineIntegration: { findFirst: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'LINE_CREDENTIALS_ENCRYPTION_KEY'
        ? encryptionKey
        : 'https://api.example.com',
    ),
  };
  const service = new LineNotificationsService(
    prisma as never,
    config as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string) =>
      key === 'LINE_CREDENTIALS_ENCRYPTION_KEY'
        ? encryptionKey
        : 'https://api.example.com',
    );
    prisma.tenantLineIntegration.findFirst.mockResolvedValue({
      tenantId,
      channelSecretEncrypted: encrypt(channelSecret, encryptionKey),
    });
    prisma.tenantLineIntegration.upsert.mockResolvedValue({
      enabled: true,
      officialAccountUrl: 'https://line.me/R/ti/p/@shop',
    });
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => unknown) => callback(tx),
    );
    tx.lineWebhookEvent.createMany.mockResolvedValue({ count: 1 });
    tx.lineLinkChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      customerId,
    });
    tx.lineLinkChallenge.updateMany.mockResolvedValue({ count: 1 });
    tx.customerLineLink.findFirst.mockResolvedValue(null);
    tx.customerLineLink.upsert.mockResolvedValue({});
    tx.consent.create.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies the LINE access token before storing encrypted credentials', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await service.configureTenant(
      { tenantId, role: 'MERCHANT_OWNER' } as never,
      {
        channelAccessToken: 'line-channel-access-token-value',
        channelSecret,
        officialAccountUrl: 'https://line.me/R/ti/p/@shop',
      },
    );

    expect(prisma.tenantLineIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId,
          channelAccessTokenEncrypted: expect.not.stringContaining(
            'line-channel-access-token-value',
          ),
        }),
      }),
    );
  });

  it('does not store a rejected LINE access token', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      service.configureTenant({ tenantId, role: 'MERCHANT_OWNER' } as never, {
        channelAccessToken: 'invalid-line-channel-access-token',
        channelSecret,
        officialAccountUrl: 'https://line.me/R/ti/p/@shop',
      }),
    ).rejects.toThrow('LINE channel access token was rejected.');
    expect(prisma.tenantLineIntegration.upsert).not.toHaveBeenCalled();
  });

  it('rejects webhooks whose LINE signature is invalid', async () => {
    await expect(
      service.handleWebhook(tenantId, 'invalid', Buffer.from('{"events":[]}')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('links only the customer that owns the one-time code', async () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        events: [
          {
            webhookEventId: 'event-1',
            type: 'message',
            source: { userId: 'U-line-user' },
            message: { type: 'text', text: `LINK ${code}` },
          },
        ],
      }),
    );
    const signature = sign(rawBody, channelSecret);

    await expect(
      service.handleWebhook(tenantId, signature, rawBody),
    ).resolves.toEqual({ accepted: true });

    expect(tx.lineLinkChallenge.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId,
        codeHash: createHmac('sha256', encryptionKey)
          .update(`${tenantId}:${code}`)
          .digest('hex'),
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    });
    expect(tx.customerLineLink.upsert).toHaveBeenCalledWith({
      where: { customerId },
      create: { tenantId, customerId, lineUserId: 'U-line-user' },
      update: {
        lineUserId: 'U-line-user',
        linkedAt: expect.any(Date),
        revokedAt: null,
      },
    });
    expect(tx.consent.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        type: ConsentType.LINE_NOTIFICATIONS,
        version: 'line-notifications-v1',
        grantedAt: expect.any(Date),
      },
    });
  });

  it('revokes consent and cancels pending messages when the customer sends STOP', async () => {
    tx.customerLineLink.findFirst.mockResolvedValueOnce({ customerId });
    const rawBody = Buffer.from(
      JSON.stringify({
        events: [
          {
            webhookEventId: 'event-stop',
            type: 'message',
            source: { userId: 'U-line-user' },
            message: { type: 'text', text: 'STOP' },
          },
        ],
      }),
    );

    await service.handleWebhook(
      tenantId,
      sign(rawBody, channelSecret),
      rawBody,
    );

    expect(tx.customerLineLink.updateMany).toHaveBeenCalledWith({
      where: { tenantId, customerId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.consent.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        customerId,
        type: ConsentType.LINE_NOTIFICATIONS,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.lineNotificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { tenantId, customerId, status: 'PENDING' },
      data: { status: 'CANCELLED', lockedUntil: null },
    });
  });

  it('does not process a redelivered LINE event twice', async () => {
    tx.lineWebhookEvent.createMany.mockResolvedValueOnce({ count: 0 });
    const rawBody = Buffer.from(
      JSON.stringify({
        events: [
          {
            webhookEventId: 'event-duplicate',
            type: 'message',
            source: { userId: 'U-line-user' },
            message: { type: 'text', text: `LINK ${code}` },
          },
        ],
      }),
    );

    await service.handleWebhook(
      tenantId,
      sign(rawBody, channelSecret),
      rawBody,
    );

    expect(tx.lineLinkChallenge.findFirst).not.toHaveBeenCalled();
    expect(tx.customerLineLink.upsert).not.toHaveBeenCalled();
  });

  it('revokes notification consent when the customer unfollows the account', async () => {
    tx.customerLineLink.findFirst.mockResolvedValueOnce({ customerId });
    const rawBody = Buffer.from(
      JSON.stringify({
        events: [
          {
            webhookEventId: 'event-unfollow',
            type: 'unfollow',
            source: { userId: 'U-line-user' },
          },
        ],
      }),
    );

    await service.handleWebhook(
      tenantId,
      sign(rawBody, channelSecret),
      rawBody,
    );

    expect(tx.consent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customerId }),
        data: { revokedAt: expect.any(Date) },
      }),
    );
  });
});

function sign(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}

function encrypt(value: string, secret: string): string {
  const iv = Buffer.alloc(12, 1);
  const cipher = createCipheriv(
    'aes-256-gcm',
    createHash('sha256').update(secret).digest(),
    iv,
  );
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
