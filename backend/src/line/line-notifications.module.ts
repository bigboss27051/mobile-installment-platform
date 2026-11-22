import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CustomerLineLinkController,
  LineWebhookController,
  TenantLineIntegrationController,
} from './line-notifications.controller';
import { LineNotificationsService } from './line-notifications.service';
import { LineNotificationsWorker } from './line-notifications.worker';

@Module({
  imports: [PrismaModule],
  controllers: [
    TenantLineIntegrationController,
    CustomerLineLinkController,
    LineWebhookController,
  ],
  providers: [LineNotificationsService, LineNotificationsWorker],
  exports: [LineNotificationsService],
})
export class LineNotificationsModule {}
