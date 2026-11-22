import { Module } from '@nestjs/common';
import { LineConfigService } from './line-config.service';
import { LineController } from './line.controller';
import { LineInstallmentQueryService } from './line-installment-query.service';
import { LineLinkingService } from './line-linking.service';
import { LineNotifyService } from './line-notify.service';
import { LineWebhookController } from './line-webhook.controller';
import { LineWebhookService } from './line-webhook.service';

@Module({
  controllers: [LineController, LineWebhookController],
  providers: [
    LineConfigService,
    LineLinkingService,
    LineInstallmentQueryService,
    LineNotifyService,
    LineWebhookService,
  ],
  exports: [LineNotifyService, LineConfigService, LineLinkingService],
})
export class LineModule {}
