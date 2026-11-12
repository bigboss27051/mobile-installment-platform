import { createHmac } from 'crypto';
import {
  SandboxPaymentAdapter,
  signSandboxWebhook,
} from './sandbox-payment.adapter';

const WEBHOOK_SECRET = 'test-payment-webhook-secret-32chars';

describe('SandboxPaymentAdapter', () => {
  const adapter = new SandboxPaymentAdapter(WEBHOOK_SECRET);

  describe('createPromptPayIntent', () => {
    it('returns sandbox PromptPay QR payload', async () => {
      const result = await adapter.createPromptPayIntent({
        tenantId: 'tenant-1',
        intentId: 'intent-abc',
        amount: '1500.00',
        currency: 'THB',
      });

      expect(result).toEqual({
        provider: 'sandbox',
        providerRef: 'sandbox_intent-abc',
        qrPayload: {
          type: 'promptpay',
          amount: '1500.00',
          currency: 'THB',
        },
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a valid x-mip-signature', () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        providerEventId: 'evt-1',
        providerRef: 'sandbox_intent-1',
        amount: '500.00',
        status: 'SUCCEEDED',
      }),
    );
    const signature = signSandboxWebhook(rawBody, WEBHOOK_SECRET);

      expect(
        adapter.verifyWebhookSignature({ 'x-mip-signature': signature }, rawBody),
      ).toBe(true);
    });

    it('rejects an invalid signature', () => {
      const rawBody = Buffer.from('{"providerEventId":"evt-1"}');

      expect(
        adapter.verifyWebhookSignature({ 'x-mip-signature': 'deadbeef'.repeat(8) }, rawBody),
      ).toBe(false);
    });

    it('rejects when x-mip-signature is missing', () => {
      const rawBody = Buffer.from('{}');

      expect(adapter.verifyWebhookSignature({}, rawBody)).toBe(false);
    });

    it('uses constant-time comparison for valid-length signatures', () => {
      const rawBody = Buffer.from('{"a":1}');
      const valid = signSandboxWebhook(rawBody, WEBHOOK_SECRET);
      const tampered = valid.slice(0, -1) + (valid.endsWith('a') ? 'b' : 'a');

      expect(adapter.verifyWebhookSignature({ 'x-mip-signature': tampered }, rawBody)).toBe(
        false,
      );
    });
  });

  describe('parseWebhookEvent', () => {
    it('parses sandbox webhook JSON', () => {
      const payload = {
        providerEventId: 'evt-99',
        providerRef: 'sandbox_intent-99',
        amount: '1200.50',
        status: 'SUCCEEDED' as const,
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      expect(adapter.parseWebhookEvent(rawBody)).toEqual(payload);
    });
  });

  describe('signSandboxWebhook', () => {
    it('matches HMAC-SHA256 hex of raw body', () => {
      const rawBody = Buffer.from('webhook-payload');
      const expected = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      expect(signSandboxWebhook(rawBody, WEBHOOK_SECRET)).toBe(expected);
    });
  });
});
