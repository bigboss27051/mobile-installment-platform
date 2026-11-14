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
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreatePaymentIntentDto } from '../payments/dto/create-payment-intent.dto';
import { PortalService } from './portal.service';

@Controller('me')
@UseGuards(CustomerJwtGuard)
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('contracts')
  async listContracts(@CurrentUser() user: TenantContext) {
    const contracts = await this.portal.listContracts(user);
    return { data: contracts };
  }

  @Get('contracts/:id')
  async getContract(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const contract = await this.portal.getContract(user, id);
    return { data: contract };
  }

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
    const intent = await this.portal.createPaymentIntent(
      user,
      id,
      dto.amount,
      idempotencyKey,
    );
    return { data: intent };
  }

  @Get('payment-intents/:id')
  async getIntent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const intent = await this.portal.getPaymentIntent(user, id);
    return { data: intent };
  }

  @Get('lock-status')
  async lockStatus(@CurrentUser() user: TenantContext) {
    const status = await this.portal.getLockStatus(user);
    return { data: status };
  }
}
