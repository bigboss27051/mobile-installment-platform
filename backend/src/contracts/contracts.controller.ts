import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { ContractsService } from './contracts.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post('applications/:id/contracts')
  async createFromApplication(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const contract = await this.contracts.createFromApplication(user, id);
    return { data: contract };
  }

  @Get('contracts')
  async list(@CurrentUser() user: TenantContext) {
    const contracts = await this.contracts.list(user);
    return { data: contracts };
  }

  @Get('contracts/:id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: TenantContext) {
    const contract = await this.contracts.getById(user, id);
    return { data: contract };
  }
}
