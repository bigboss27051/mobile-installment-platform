import { Controller, Get, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenants.getPublicBySlug(slug);
    return { data: tenant };
  }
}
