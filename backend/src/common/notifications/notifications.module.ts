import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineCredentialsCrypto } from './line-credentials-crypto';
import { NOTIFICATION_CHANNEL } from './notification-channel.port';
import { SandboxLineAdapter } from './sandbox-line.adapter';

export const LINE_CREDENTIALS_CRYPTO = Symbol('LINE_CREDENTIALS_CRYPTO');

@Global()
@Module({
  providers: [
    SandboxLineAdapter,
    {
      provide: NOTIFICATION_CHANNEL,
      useExisting: SandboxLineAdapter,
    },
    {
      provide: LINE_CREDENTIALS_CRYPTO,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const key =
          config.get<string>('LINE_CREDENTIALS_ENCRYPTION_KEY') ||
          config.getOrThrow<string>('NATIONAL_ID_ENCRYPTION_KEY');
        return new LineCredentialsCrypto(key);
      },
    },
  ],
  exports: [NOTIFICATION_CHANNEL, LINE_CREDENTIALS_CRYPTO, SandboxLineAdapter],
})
export class NotificationsModule {}
