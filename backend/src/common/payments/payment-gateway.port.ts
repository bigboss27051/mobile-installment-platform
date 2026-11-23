export interface CreatePromptPayIntentInput {
  tenantId: string;
  intentId: string;
  amount: string;
  currency: 'THB';
}

export interface PromptPayIntentResult {
  provider: 'sandbox' | 'stripe';
  providerRef: string;
  qrPayload: Record<string, unknown>;
}

export interface ParsedWebhookEvent {
  providerEventId: string;
  providerRef: string;
  amount: string;
  status: 'SUCCEEDED' | 'FAILED';
}

export interface PaymentGatewayPort {
  createPromptPayIntent(input: CreatePromptPayIntentInput): Promise<PromptPayIntentResult>;

  verifyWebhookSignature(headers: Record<string, string>, rawBody: Buffer): boolean;

  parseWebhookEvent(rawBody: Buffer): ParsedWebhookEvent;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
