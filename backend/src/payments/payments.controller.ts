import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentsService } from './payments.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('contracts/:id/payment-intents')
  async createIntent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const intent = await this.payments.createIntent(
      user,
      id,
      dto.amount,
      idempotencyKey,
    );
    return { data: intent };
  }

  @Get('payment-intents/:id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const intent = await this.payments.getById(user, id);
    return { data: intent };
  }
}
