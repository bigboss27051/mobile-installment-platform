import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import {
  CreatePromptPayIntentInput,
  ParsedWebhookEvent,
  PaymentGatewayPort,
  PromptPayIntentResult,
} from './payment-gateway.port';

const PROMPTPAY_MIN_THB = '20.00';

export class IgnorableStripeEventError extends Error {
  constructor(readonly eventType: string) {
    super(`Ignorable Stripe event: ${eventType}`);
    this.name = 'IgnorableStripeEventError';
  }
}

export type StripePaymentAdapterDeps = {
  stripe: Stripe;
  webhookSecret: string;
  billingEmail: string;
};

function thbToSatang(amount: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new BadRequestException('Invalid THB amount for Stripe PromptPay.');
  }
  const whole = Number(match[1]);
  const frac = (match[2] ?? '').padEnd(2, '0').slice(0, 2);
  return whole * 100 + Number(frac);
}

export class StripePaymentAdapter implements PaymentGatewayPort {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly billingEmail: string;
  private lastVerifiedEvent: Stripe.Event | null = null;

  constructor(deps: StripePaymentAdapterDeps) {
    this.stripe = deps.stripe;
    this.webhookSecret = deps.webhookSecret;
    this.billingEmail = deps.billingEmail;
  }

  async createPromptPayIntent(
    input: CreatePromptPayIntentInput,
  ): Promise<PromptPayIntentResult> {
    if (thbToSatang(input.amount) < thbToSatang(PROMPTPAY_MIN_THB)) {
      throw new BadRequestException(
        `Stripe PromptPay requires amount >= ${PROMPTPAY_MIN_THB} THB.`,
      );
    }
    const amountSatang = thbToSatang(input.amount);
    if (amountSatang <= 0) {
      throw new BadRequestException('Invalid THB amount for Stripe PromptPay.');
    }

    const created = await this.stripe.paymentIntents.create(
      {
        amount: amountSatang,
        currency: 'thb',
        allowed_payment_method_types: ['promptpay'],
        metadata: {
          mipIntentId: input.intentId,
          tenantId: input.tenantId,
        },
      },
      { idempotencyKey: `mip-pi-create-${input.intentId}` },
    );

    const confirmed = await this.stripe.paymentIntents.confirm(
      created.id,
      {
        payment_method_data: {
          type: 'promptpay',
          billing_details: { email: this.billingEmail },
        },
      },
      { idempotencyKey: `mip-pi-confirm-${input.intentId}` },
    );

    const qr = confirmed.next_action?.promptpay_display_qr_code;
    if (!qr?.image_url_png) {
      throw new BadRequestException(
        'Stripe PromptPay QR missing from next_action.',
      );
    }

    return {
      provider: 'stripe',
      providerRef: confirmed.id,
      qrPayload: {
        type: 'promptpay',
        provider: 'stripe',
        amount: input.amount,
        currency: 'THB',
        imageUrlPng: qr.image_url_png,
        imageUrlSvg: qr.image_url_svg ?? null,
        hostedInstructionsUrl: qr.hosted_instructions_url ?? null,
      },
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): boolean {
    const signature =
      headers['stripe-signature'] ?? headers['Stripe-Signature'] ?? '';
    if (!signature) {
      return false;
    }
    try {
      this.lastVerifiedEvent = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      this.lastVerifiedEvent = null;
      return false;
    }
  }

  parseWebhookEvent(rawBody: Buffer): ParsedWebhookEvent {
    void rawBody;
    const event = this.lastVerifiedEvent;
    if (!event) {
      throw new BadRequestException('Stripe event not verified.');
    }

    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed' &&
      event.type !== 'payment_intent.canceled'
    ) {
      throw new IgnorableStripeEventError(event.type);
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    const satang = pi.amount_received || pi.amount;
    const amount = (satang / 100).toFixed(2);
    const status =
      event.type === 'payment_intent.succeeded' ? 'SUCCEEDED' : 'FAILED';

    return {
      providerEventId: event.id,
      providerRef: pi.id,
      amount,
      status,
    };
  }
}
