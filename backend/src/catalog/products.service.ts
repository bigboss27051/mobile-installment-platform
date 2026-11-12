import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, ProductVariant } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(
    ctx: TenantContext,
    input: CreateProductDto,
  ): Promise<Product> {
    const tenantId = this.requireTenantId(ctx);
    return this.prisma.product.create({
      data: {
        tenantId,
        name: input.name,
        brand: input.brand,
      },
    });
  }

  async createVariant(
    ctx: TenantContext,
    productId: string,
    input: CreateVariantDto,
  ): Promise<ProductVariant> {
    const tenantId = this.requireTenantId(ctx);
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          tenantId,
          productId,
          sku: input.sku,
          color: input.color,
          storage: input.storage,
          price: new Prisma.Decimal(input.price),
          currency: 'THB',
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('SKU already exists for this tenant.');
      }
      throw error;
    }
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }
}
