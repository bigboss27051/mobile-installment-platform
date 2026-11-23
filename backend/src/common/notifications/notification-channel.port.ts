export type SendTextInput = {
  accessToken: string;
  toLineUserId: string;
  text: string;
};

export interface NotificationChannelPort {
  verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
    channelSecret: string,
  ): boolean;

  sendTextMessage(input: SendTextInput): Promise<{ providerMessageId: string }>;
}

export const NOTIFICATION_CHANNEL = Symbol('NOTIFICATION_CHANNEL');
