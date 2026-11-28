import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/authz/permissions.guard';
import { RequirePermissions } from '../common/authz/require-permissions.decorator';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { UpdateShopSetupDto } from './dto/update-shop-setup.dto';
import { ShopSetupService } from './shop-setup.service';

@Controller('devices/shop-setup')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShopSetupController {
  constructor(private readonly shopSetup: ShopSetupService) {}

  @Get()
  @RequirePermissions('devices.enroll')
  async get(@CurrentUser() user: TenantContext) {
    return { data: await this.shopSetup.get(user) };
  }

  @Put()
  @RequirePermissions('devices.enroll')
  async put(
    @Body() dto: UpdateShopSetupDto,
    @CurrentUser() user: TenantContext,
  ) {
    return { data: await this.shopSetup.put(user, dto) };
  }
}
