import { Module, forwardRef } from '@nestjs/common';
import { PaymentsGatewayModule } from '../common/payments/payments-gateway.module';
import { DevicesModule } from '../devices/devices.module';
import { LineModule } from '../line/line.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    PaymentsGatewayModule,
    PrismaModule,
    DevicesModule,
    forwardRef(() => LineModule),
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
