import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/authz/permissions.guard';
import { RequirePermissions } from '../common/authz/require-permissions.decorator';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { PutStaffBranchesDto } from './dto/put-staff-branches.dto';
import { StaffBranchesService } from './staff-branches.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffBranchesController {
  constructor(private readonly staffBranches: StaffBranchesService) {}

  @Get(':userId/branches')
  @RequirePermissions('staff.branches.manage')
  async list(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const data = await this.staffBranches.listBranches(user, userId);
    return { data };
  }

  @Put(':userId/branches')
  @RequirePermissions('staff.branches.manage')
  async put(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: PutStaffBranchesDto,
    @CurrentUser() user: TenantContext,
  ) {
    const data = await this.staffBranches.putBranches(
      user,
      userId,
      dto.branchIds,
    );
    return { data };
  }
}
