import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { LineWebhookService } from './line-webhook.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks/line')
export class LineWebhookController {
  constructor(private readonly webhooks: LineWebhookService) {}

  @Post(':tenantId')
  async handle(
    @Param('tenantId', new ParseUUIDPipe()) tenantId: string,
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('Raw webhook body is required.');
    }
    return this.webhooks.handle(tenantId, req.rawBody, headers);
  }
}
