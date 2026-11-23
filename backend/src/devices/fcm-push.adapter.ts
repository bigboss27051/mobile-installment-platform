import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

const TOKEN_LOG_PREFIX_LEN = 8;

export function maskFcmTokenForLog(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return '(empty)';
  }
  const prefix = trimmed.slice(0, TOKEN_LOG_PREFIX_LEN);
  return `${prefix}…`;
}

@Injectable()
export class FcmPushAdapter {
  private readonly logger = new Logger(FcmPushAdapter.name);
  private messaging: Messaging | null | undefined;
  private initAttempted = false;

  private resolveMessaging(): Messaging | null {
    if (this.initAttempted) {
      return this.messaging ?? null;
    }
    this.initAttempted = true;

    const path = process.env.FCM_SERVICE_ACCOUNT_PATH?.trim();
    if (!path) {
      this.messaging = null;
      return null;
    }

    try {
      const raw = readFileSync(path, 'utf8');
      const serviceAccount = JSON.parse(raw) as ServiceAccount;
      const app =
        getApps().length > 0
          ? getApp()
          : initializeApp({ credential: cert(serviceAccount) });
      this.messaging = getMessaging(app);
    } catch (err) {
      this.logger.warn(
        `FCM Admin SDK init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.messaging = null;
    }

    return this.messaging ?? null;
  }

  async sendPollNow(token: string): Promise<void> {
    const trimmed = token?.trim();
    if (!trimmed) {
      return;
    }

    const messaging = this.resolveMessaging();
    if (!messaging) {
      return;
    }

    this.logger.log(`FCM POLL_NOW → ${maskFcmTokenForLog(trimmed)}`);
    await messaging.send({
      token: trimmed,
      data: { type: 'POLL_NOW' },
    });
  }
}