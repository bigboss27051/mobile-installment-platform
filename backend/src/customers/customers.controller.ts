import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  async create(@Body() input: CreateCustomerDto, @CurrentUser() user: TenantContext) {
    const customer = await this.customers.create(user, input);
    return { data: customer };
  }

  @Get()
  async list(@CurrentUser() user: TenantContext) {
    const customers = await this.customers.list(user);
    return { data: customers };
  }

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const customer = await this.customers.getById(user, id);
    return { data: customer };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCustomerDto,
    @CurrentUser() user: TenantContext,
  ) {
    const customer = await this.customers.update(user, id, input);
    return { data: customer };
  }
}
