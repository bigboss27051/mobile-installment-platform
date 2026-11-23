import { BadRequestException } from '@nestjs/common';
import {
  IgnorableStripeEventError,
  StripePaymentAdapter,
} from './stripe-payment.adapter';

describe('StripePaymentAdapter', () => {
  const webhookSecret = 'whsec_test_secret';
  const billingEmail = 'lab@example.com';
  let create: jest.Mock;
  let confirm: jest.Mock;
  let constructEvent: jest.Mock;
  let adapter: StripePaymentAdapter;

  beforeEach(() => {
    create = jest.fn();
    confirm = jest.fn();
    constructEvent = jest.fn();
    const stripe = {
      paymentIntents: { create, confirm },
      webhooks: { constructEvent },
    };
    adapter = new StripePaymentAdapter({
      stripe: stripe as never,
      webhookSecret,
      billingEmail,
    });
  });

  it('creates and confirms PromptPay PI and returns QR payload', async () => {
    create.mockResolvedValue({ id: 'pi_123' });
    confirm.mockResolvedValue({
      id: 'pi_123',
      next_action: {
        promptpay_display_qr_code: {
          image_url_png: 'https://example.com/qr.png',
          image_url_svg: 'https://example.com/qr.svg',
          hosted_instructions_url: 'https://example.com/pay',
        },
      },
    });

    const result = await adapter.createPromptPayIntent({
      tenantId: 't1',
      intentId: 'intent-1',
      amount: '100.00',
      currency: 'THB',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        currency: 'thb',
        allowed_payment_method_types: ['promptpay'],
        metadata: expect.objectContaining({ mipIntentId: 'intent-1' }),
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining('intent-1'),
      }),
    );
    expect(result).toEqual({
      provider: 'stripe',
      providerRef: 'pi_123',
      qrPayload: {
        type: 'promptpay',
        provider: 'stripe',
        amount: '100.00',
        currency: 'THB',
        imageUrlPng: 'https://example.com/qr.png',
        imageUrlSvg: 'https://example.com/qr.svg',
        hostedInstructionsUrl: 'https://example.com/pay',
      },
    });
  });

  it('rejects amounts below 20.00 THB before calling Stripe', async () => {
    await expect(
      adapter.createPromptPayIntent({
        tenantId: 't1',
        intentId: 'intent-2',
        amount: '19.99',
        currency: 'THB',
      }),
    ).rejects.toThrow(/20/);
    expect(create).not.toHaveBeenCalled();
  });

  it('verifyWebhookSignature returns true when constructEvent succeeds', () => {
    constructEvent.mockReturnValue({ id: 'evt_1' });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(true);
  });

  it('verifyWebhookSignature returns false when constructEvent throws', () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(false);
  });

  it('parseWebhookEvent maps payment_intent.succeeded', () => {
    constructEvent.mockReturnValue({
      id: 'evt_ok',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount: 10000,
          amount_received: 10000,
          currency: 'thb',
        },
      },
    });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(true);
    expect(adapter.parseWebhookEvent(Buffer.from('{}'))).toEqual({
      providerEventId: 'evt_ok',
      providerRef: 'pi_123',
      amount: '100.00',
      status: 'SUCCEEDED',
    });
  });

  it('parseWebhookEvent maps payment_intent.payment_failed to FAILED', () => {
    constructEvent.mockReturnValue({
      id: 'evt_fail',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_9', amount: 5000, currency: 'thb' } },
    });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(true);
    expect(adapter.parseWebhookEvent(Buffer.from('{}'))).toEqual({
      providerEventId: 'evt_fail',
      providerRef: 'pi_9',
      amount: '50.00',
      status: 'FAILED',
    });
  });

  it('parseWebhookEvent throws IgnorableStripeEventError for other types', () => {
    constructEvent.mockReturnValue({
      id: 'evt_other',
      type: 'charge.updated',
      data: { object: {} },
    });
    expect(
      adapter.verifyWebhookSignature(
        { 'stripe-signature': 'sig' },
        Buffer.from('{}'),
      ),
    ).toBe(true);
    expect(() => adapter.parseWebhookEvent(Buffer.from('{}'))).toThrow(
      IgnorableStripeEventError,
    );
  });

  it('parseWebhookEvent without verify throws', () => {
    expect(() => adapter.parseWebhookEvent(Buffer.from('{}'))).toThrow(
      BadRequestException,
    );
  });
});
