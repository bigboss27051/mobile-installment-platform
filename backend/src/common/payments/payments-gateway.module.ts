import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PAYMENT_GATEWAY } from './payment-gateway.port';
import { SandboxPaymentAdapter } from './sandbox-payment.adapter';
import { StripePaymentAdapter } from './stripe-payment.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SandboxPaymentAdapter,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new SandboxPaymentAdapter(configService),
    },
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, SandboxPaymentAdapter],
      useFactory: (
        configService: ConfigService,
        sandboxPaymentAdapter: SandboxPaymentAdapter,
      ) => {
        const provider = configService.get<string>('PAYMENT_PROVIDER', 'sandbox');
        if (provider === 'sandbox') {
          return sandboxPaymentAdapter;
        }
        if (provider === 'stripe') {
          const stripe = new Stripe(
            configService.getOrThrow<string>('STRIPE_PRIVATE_KEY'),
          );
          return new StripePaymentAdapter({
            stripe,
            webhookSecret: configService.getOrThrow<string>(
              'STRIPE_WEBHOOK_SECRET',
            ),
            billingEmail: configService.getOrThrow<string>(
              'STRIPE_PROMPTPAY_BILLING_EMAIL',
            ),
          });
        }

        throw new Error(`Unsupported PAYMENT_PROVIDER value: ${provider}`);
      },
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsGatewayModule {}
