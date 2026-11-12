import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY } from './payment-gateway.port';
import { SandboxPaymentAdapter } from './sandbox-payment.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    SandboxPaymentAdapter,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, SandboxPaymentAdapter],
      useFactory: (configService: ConfigService, sandboxPaymentAdapter: SandboxPaymentAdapter) => {
        const provider = configService.get<string>('PAYMENT_PROVIDER', 'sandbox');
        if (provider === 'sandbox') {
          return sandboxPaymentAdapter;
        }

        throw new Error(`Unsupported PAYMENT_PROVIDER value: ${provider}`);
      },
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsGatewayModule {}
