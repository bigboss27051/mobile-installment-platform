import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsString, IsUrl, MinLength } from 'class-validator';
import { Request } from 'express';
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/authz/require-permissions.decorator';
import { PermissionsGuard } from '../common/authz/permissions.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { LineNotificationsService } from './line-notifications.service';

class ConfigureLineIntegrationDto {
  @IsString()
  @MinLength(20)
  channelAccessToken!: string;

  @IsString()
  @MinLength(16)
  channelSecret!: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  officialAccountUrl!: string;
}

class StartLineLinkDto {
  @IsBoolean()
  consent!: boolean;
}

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('tenants/me/line-integration')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('notifications.manage')
export class TenantLineIntegrationController {
  constructor(private readonly line: LineNotificationsService) {}

  @Get()
  async getConfiguration(@CurrentUser() user: TenantContext) {
    return { data: await this.line.getTenantConfiguration(user) };
  }

  @Post()
  async configure(
    @CurrentUser() user: TenantContext,
    @Body() input: ConfigureLineIntegrationDto,
  ) {
    return { data: await this.line.configureTenant(user, input) };
  }

  @Delete()
  async disable(@CurrentUser() user: TenantContext) {
    return { data: await this.line.disableTenant(user) };
  }
}

@Controller('me/line-link')
@UseGuards(CustomerJwtGuard)
export class CustomerLineLinkController {
  constructor(private readonly line: LineNotificationsService) {}

  @Get()
  async status(@CurrentUser() user: TenantContext) {
    return { data: await this.line.getCustomerLink(user) };
  }

  @Post()
  async start(
    @CurrentUser() user: TenantContext,
    @Body() input: StartLineLinkDto,
  ) {
    return { data: await this.line.requestCustomerLink(user, input.consent) };
  }

  @Delete()
  async unlink(@CurrentUser() user: TenantContext) {
    return { data: await this.line.unlinkCustomer(user) };
  }
}

@Controller('webhooks/line')
export class LineWebhookController {
  constructor(private readonly line: LineNotificationsService) {}

  @Post(':tenantId')
  async webhook(
    @Param('tenantId') tenantId: string,
    @Headers('x-line-signature') signature: string | undefined,
    @Req() req: RawBodyRequest,
  ) {
    if (!Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('Raw LINE webhook body is required.');
    }
    return this.line.handleWebhook(tenantId, signature, req.rawBody);
  }
}
