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
import { PermissionsGuard } from '../common/authz/permissions.guard';
import { RequirePermissions } from '../common/authz/require-permissions.decorator';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { ActivateDeviceDto } from './dto/activate-device.dto';
import { BindContractDto, UnbindContractDto } from './dto/bind-contract.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeviceLifecycleController {
  constructor(private readonly lifecycle: DeviceLifecycleService) {}

  @Post('activate')
  @RequirePermissions('devices.activate')
  async activate(
    @Body() dto: ActivateDeviceDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const activation = await this.lifecycle.activate(user, dto, idempotencyKey);
    return { data: activation };
  }

  @Get(':id')
  async getDashboard(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const device = await this.lifecycle.getDashboard(user, id);
    return { data: device };
  }

  @Get(':id/activation')
  async getActivation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const activation = await this.lifecycle.getActivation(user, id);
    return { data: activation };
  }

  @Post(':id/bind-contract')
  @RequirePermissions('devices.bind')
  async bind(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BindContractDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const binding = await this.lifecycle.bindContract(user, id, dto, idempotencyKey);
    return { data: binding };
  }

  @Post(':id/unbind-contract')
  @RequirePermissions('devices.unbind')
  async unbind(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UnbindContractDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const binding = await this.lifecycle.unbindContract(user, id, dto, idempotencyKey);
    return { data: binding };
  }
}
