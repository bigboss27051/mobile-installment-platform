import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  async create(@Body() input: CreateApplicationDto, @CurrentUser() user: TenantContext) {
    const application = await this.applications.create(user, input);
    return { data: application };
  }

  @Get()
  async list(@CurrentUser() user: TenantContext) {
    const applications = await this.applications.list(user);
    return { data: applications };
  }

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const application = await this.applications.getById(user, id);
    return { data: application };
  }

  @Post(':id/submit')
  async submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const application = await this.applications.submit(user, id);
    return { data: application };
  }
}
