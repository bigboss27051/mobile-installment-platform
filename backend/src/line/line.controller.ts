import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/authz/permissions.guard';
import { RequirePermissions } from '../common/authz/require-permissions.decorator';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { SendLineReminderDto } from './dto/send-line-reminder.dto';
import { UpsertLineConfigDto } from './dto/upsert-line-config.dto';
import { LineConfigService } from './line-config.service';
import { LineLinkingService } from './line-linking.service';
import { LineNotifyService } from './line-notify.service';

@Controller('line')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LineController {
  constructor(
    private readonly config: LineConfigService,
    private readonly linking: LineLinkingService,
    private readonly notify: LineNotifyService,
  ) {}

  @Get('config')
  @RequirePermissions('line.config')
  async getConfig(@CurrentUser() user: TenantContext) {
    return { data: await this.config.get(user) };
  }

  @Put('config')
  @RequirePermissions('line.config')
  async upsertConfig(
    @CurrentUser() user: TenantContext,
    @Body() body: UpsertLineConfigDto,
  ) {
    return { data: await this.config.upsert(user, body) };
  }

  @Delete('config')
  @RequirePermissions('line.config')
  async disconnect(@CurrentUser() user: TenantContext) {
    return { data: await this.config.disconnect(user) };
  }

  @Get('customers/:customerId/link')
  @RequirePermissions('line.link')
  async linkStatus(
    @CurrentUser() user: TenantContext,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return { data: await this.linking.getLinkStatus(user, customerId) };
  }

  @Post('customers/:customerId/link-invites')
  @RequirePermissions('line.link')
  async createInvite(
    @CurrentUser() user: TenantContext,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return { data: await this.linking.createInvite(user, customerId) };
  }

  @Post('customers/:customerId/unlink')
  @RequirePermissions('line.link')
  async unlink(
    @CurrentUser() user: TenantContext,
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
    @Body() body: { reason?: string },
  ) {
    return {
      data: await this.linking.unlink(user, customerId, body.reason ?? 'staff_unlink'),
    };
  }

  @Post('notifications/reminder')
  @RequirePermissions('line.notify')
  async reminder(
    @CurrentUser() user: TenantContext,
    @Body() body: SendLineReminderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const key = idempotencyKey?.trim() || `manual-${Date.now()}`;
    return {
      data: await this.notify.sendReminder(user, body.contractId, key),
    };
  }
}
