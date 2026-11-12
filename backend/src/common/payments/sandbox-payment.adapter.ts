import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreatePromptPayIntentInput,
  ParsedWebhookEvent,
  PaymentGatewayPort,
  PromptPayIntentResult,
} from './payment-gateway.port';

export function signSandboxWebhook(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

@Injectable()
export class SandboxPaymentAdapter implements PaymentGatewayPort {
  private readonly webhookSecret: string;

  constructor(webhookSecretOrConfig: string | ConfigService) {
    if (typeof webhookSecretOrConfig === 'string') {
      this.webhookSecret = webhookSecretOrConfig;
    } else {
      this.webhookSecret = webhookSecretOrConfig.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET');
    }
  }

  async createPromptPayIntent(input: CreatePromptPayIntentInput): Promise<PromptPayIntentResult> {
    return {
      provider: 'sandbox',
      providerRef: `sandbox_${input.intentId}`,
      qrPayload: {
        type: 'promptpay',
        amount: input.amount,
        currency: 'THB',
      },
    };
  }

  verifyWebhookSignature(headers: Record<string, string>, rawBody: Buffer): boolean {
    const signature =
      headers['x-mip-signature'] ?? headers['X-Mip-Signature'] ?? headers['X-MIP-Signature'];
    if (!signature) {
      return false;
    }

    const expected = signSandboxWebhook(rawBody, this.webhookSecret);
    const actualBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (actualBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(actualBuf, expectedBuf);
  }

  parseWebhookEvent(rawBody: Buffer): ParsedWebhookEvent {
    const parsed = JSON.parse(rawBody.toString('utf8')) as ParsedWebhookEvent;
    return parsed;
  }
}
