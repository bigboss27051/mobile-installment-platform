import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks/payments')
export class WebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('sandbox')
  async handleSandboxWebhook(
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('Raw webhook body is required.');
    }
    return this.payments.handleSandboxWebhook(req.rawBody, headers);
  }
}
