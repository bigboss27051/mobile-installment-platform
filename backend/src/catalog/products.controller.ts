import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProductVariant } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  async createProduct(
    @Body() input: CreateProductDto,
    @CurrentUser() user: TenantContext,
  ) {
    const product = await this.products.createProduct(user, input);
    return { data: product };
  }

  @Get()
  async listProducts(@CurrentUser() user: TenantContext) {
    const products = await this.products.listProducts(user);
    return { data: products };
  }

  @Get(':id')
  async getProduct(@Param('id') id: string, @CurrentUser() user: TenantContext) {
    const product = await this.products.getProductById(user, id);
    return { data: product };
  }

  @Post(':id/variants')
  async createVariant(
    @Param('id') productId: string,
    @Body() input: CreateVariantDto,
    @CurrentUser() user: TenantContext,
  ) {
    const variant = await this.products.createVariant(user, productId, input);
    return { data: this.serializeVariant(variant) };
  }

  @Get(':id/variants')
  async listVariants(
    @Param('id') productId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const variants = await this.products.listVariants(user, productId);
    return { data: variants.map((variant) => this.serializeVariant(variant)) };
  }

  private serializeVariant(variant: ProductVariant) {
    return {
      ...variant,
      price: variant.price.toFixed(2),
    };
  }
}
