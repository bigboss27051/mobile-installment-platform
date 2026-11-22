import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  NotificationChannelPort,
  SendTextInput,
} from './notification-channel.port';

/** LINE Messaging API webhook signature: Base64(HMAC-SHA256(body, channelSecret)). */
export function signLineWebhook(rawBody: Buffer, channelSecret: string): string {
  return createHmac('sha256', channelSecret).update(rawBody).digest('base64');
}

@Injectable()
export class SandboxLineAdapter implements NotificationChannelPort {
  verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
    channelSecret: string,
  ): boolean {
    const signature =
      headers['x-line-signature'] ??
      headers['X-Line-Signature'] ??
      headers['X-LINE-SIGNATURE'];
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const expected = signLineWebhook(rawBody, channelSecret);
    const actualBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (actualBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(actualBuf, expectedBuf);
  }

  async sendTextMessage(input: SendTextInput): Promise<{ providerMessageId: string }> {
    void input;
    return { providerMessageId: `sandbox_line_${randomUUID()}` };
  }
}
