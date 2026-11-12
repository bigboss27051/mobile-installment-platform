import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentType, Customer, Prisma } from '@prisma/client';
import { NationalIdCrypto } from '../common/crypto/national-id.crypto';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface CustomerResponse {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  status: Customer['status'];
  nationalIdMasked: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nationalIdCrypto: NationalIdCrypto,
  ) {}

  async create(ctx: TenantContext, input: CreateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.requireTenantId(ctx);
    try {
      const customer = await this.prisma.customer.create({
        data: {
          tenantId,
          fullName: input.fullName,
          phone: input.phone,
          nationalIdEncrypted: this.nationalIdCrypto.encrypt(input.nationalId),
          nationalIdHash: this.nationalIdCrypto.hash(input.nationalId),
          nationalIdLast4: input.nationalId.slice(-4),
          consents:
            input.consents && input.consents.length > 0
              ? {
                  create: input.consents.map((consent) => ({
                    type: consent.type as ConsentType,
                    version: consent.version,
                    grantedAt: consent.grantedAt ? new Date(consent.grantedAt) : new Date(),
                    tenant: { connect: { id: tenantId } },
                  })),
                }
              : undefined,
        },
      });

      return this.toResponse(customer);
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async list(ctx: TenantContext): Promise<CustomerResponse[]> {
    const tenantId = this.requireTenantId(ctx);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return customers.map((customer) => this.toResponse(customer));
  }

  async getById(ctx: TenantContext, customerId: string): Promise<CustomerResponse> {
    const tenantId = this.requireTenantId(ctx);
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return this.toResponse(customer);
  }

  async update(
    ctx: TenantContext,
    customerId: string,
    input: UpdateCustomerDto,
  ): Promise<CustomerResponse> {
    const tenantId = this.requireTenantId(ctx);
    const existing = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found.');
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          status: input.status,
          nationalIdEncrypted: input.nationalId
            ? this.nationalIdCrypto.encrypt(input.nationalId)
            : undefined,
          nationalIdHash: input.nationalId
            ? this.nationalIdCrypto.hash(input.nationalId)
            : undefined,
          nationalIdLast4: input.nationalId ? input.nationalId.slice(-4) : undefined,
        },
      });

      return this.toResponse(customer);
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  private toResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      tenantId: customer.tenantId,
      fullName: customer.fullName,
      phone: customer.phone,
      status: customer.status,
      nationalIdMasked: this.nationalIdCrypto.mask(customer.nationalIdLast4),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return ctx.tenantId;
  }

  private rethrowConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Phone already exists for this tenant.');
    }

    throw error;
  }
}
