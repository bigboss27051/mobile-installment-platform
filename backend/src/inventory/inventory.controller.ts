import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ImeiStatus, ProductVariant } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { ReceiveImeiDto } from './dto/receive-imei.dto';
import { ReserveImeiDto } from './dto/reserve-imei.dto';
import { TransferImeiDto } from './dto/transfer-imei.dto';
import { InventoryService } from './inventory.service';

interface ListImeiQuery {
  imei?: string;
  branchId?: string;
  status?: ImeiStatus;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('imeis/receive')
  async receive(@Body() input: ReceiveImeiDto, @CurrentUser() user: TenantContext) {
    const unit = await this.inventory.receive(user, input);
    return { data: unit };
  }

  @Get('imeis')
  async listImeiUnits(@Query() query: ListImeiQuery, @CurrentUser() user: TenantContext) {
    const imeiUnits = await this.inventory.listImeiUnits(user, {
      imei: query.imei,
      branchId: query.branchId,
      status: query.status,
    });
    return { data: imeiUnits.map((unit) => this.serializeImeiUnit(unit)) };
  }

  @Get('imeis/:id')
  async getImeiUnit(@Param('id') id: string, @CurrentUser() user: TenantContext) {
    const imeiUnit = await this.inventory.getImeiUnitById(user, id);
    return { data: this.serializeImeiUnit(imeiUnit) };
  }

  @Post('imeis/:id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() input: TransferImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.transfer(user, id, input);
    return { data: imeiUnit };
  }

  @Post('imeis/:id/reserve')
  async reserve(
    @Param('id') id: string,
    @Body() input: ReserveImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.reserve(user, id, input);
    return { data: imeiUnit };
  }

  @Post('imeis/:id/release')
  async release(
    @Param('id') id: string,
    @Body() input: ReserveImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.release(user, id, input);
    return { data: imeiUnit };
  }

  @Get('movements')
  async listMovements(
    @Query('imeiUnitId') imeiUnitId: string | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    const movements = await this.inventory.listMovements(user, imeiUnitId);
    return { data: movements };
  }

  private serializeImeiUnit(unit: { variant: ProductVariant }) {
    return {
      ...unit,
      variant: {
        ...unit.variant,
        price: unit.variant.price.toFixed(2),
      },
    };
  }
}
