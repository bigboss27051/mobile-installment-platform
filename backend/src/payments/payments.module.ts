import { Module } from '@nestjs/common';
import { PaymentsGatewayModule } from '../common/payments/payments-gateway.module';
import { DevicesModule } from '../devices/devices.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PaymentsGatewayModule, PrismaModule, DevicesModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
