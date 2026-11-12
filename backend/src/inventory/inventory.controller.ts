import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductVariant } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { ListImeiUnitsQueryDto } from './dto/list-imei-units-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { ReceiveImeiDto } from './dto/receive-imei.dto';
import { ReserveImeiDto } from './dto/reserve-imei.dto';
import { TransferImeiDto } from './dto/transfer-imei.dto';
import { InventoryService } from './inventory.service';

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
  async listImeiUnits(
    @Query() query: ListImeiUnitsQueryDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnits = await this.inventory.listImeiUnits(user, {
      imei: query.imei,
      branchId: query.branchId,
      status: query.status,
    });
    return { data: imeiUnits.map((unit) => this.serializeImeiUnit(unit)) };
  }

  @Get('imeis/:id')
  async getImeiUnit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.getImeiUnitById(user, id);
    return { data: this.serializeImeiUnit(imeiUnit) };
  }

  @Post('imeis/:id/transfer')
  async transfer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: TransferImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.transfer(user, id, input);
    return { data: imeiUnit };
  }

  @Post('imeis/:id/reserve')
  async reserve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ReserveImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.reserve(user, id, input);
    return { data: imeiUnit };
  }

  @Post('imeis/:id/release')
  async release(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ReserveImeiDto,
    @CurrentUser() user: TenantContext,
  ) {
    const imeiUnit = await this.inventory.release(user, id, input);
    return { data: imeiUnit };
  }

  @Get('movements')
  async listMovements(
    @Query() query: ListMovementsQueryDto,
    @CurrentUser() user: TenantContext,
  ) {
    const movements = await this.inventory.listMovements(user, query.imeiUnitId);
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
