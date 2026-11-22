import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LineLinkStatus, PlatformRole } from '@prisma/client';
import { LineCredentialsCrypto } from '../common/notifications/line-credentials-crypto';
import { LineLinkingService } from './line-linking.service';

describe('LineLinkingService', () => {
  const crypto = new LineCredentialsCrypto(
    'replace-with-at-least-32-character-secret',
  );
  const prisma = {
    customer: { findFirst: jest.fn() },
    lineLinkingToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    lineCustomerLink: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    lineAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new LineLinkingService(prisma as never, crypto);
  const ctx = {
    tenantId: 't1',
    userId: 'u1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createInvite returns raw token once and stores hash', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1' });
    prisma.lineLinkingToken.create.mockResolvedValue({});
    prisma.lineAuditEvent.create.mockResolvedValue({});

    const result = await service.createInvite(ctx, 'c1');
    expect(result.token.length).toBeGreaterThan(10);
    expect(prisma.lineLinkingToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: crypto.hashToken(result.token),
          customerId: 'c1',
        }),
      }),
    );
  });

  it('consumeLinkToken rejects expired/missing token', async () => {
    prisma.lineLinkingToken.findFirst.mockResolvedValue(null);
    await expect(
      service.consumeLinkToken({
        tenantId: 't1',
        lineUserId: 'U1',
        rawToken: 'nope',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('consumeLinkToken rejects line user linked to another customer', async () => {
    prisma.lineLinkingToken.findFirst.mockResolvedValue({
      id: 'tok1',
      customerId: 'c1',
    });
    prisma.lineCustomerLink.findFirst
      .mockResolvedValueOnce({
        customerId: 'c2',
        lineUserId: 'U1',
        status: LineLinkStatus.ACTIVE,
      });

    await expect(
      service.consumeLinkToken({
        tenantId: 't1',
        lineUserId: 'U1',
        rawToken: 'abc',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
