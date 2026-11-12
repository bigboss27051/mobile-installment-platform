import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  ContractStatus,
  ImeiStatus,
  PlatformRole,
  Prisma,
  ScheduleItemStatus,
  StockMovementType,
} from '@prisma/client';
import { generateSchedule } from '../common/schedule/schedule';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

type ContractRecord = Prisma.ContractGetPayload<Record<string, never>>;
type ContractVersionRecord = Prisma.ContractVersionGetPayload<Record<string, never>>;
type ScheduleItemRecord = Prisma.PaymentScheduleItemGetPayload<Record<string, never>>;

export type ContractVersionResponse = {
  id: string;
  version: number;
  terms: unknown;
  scheduleHash: string;
  createdAt: Date;
};

export type PaymentScheduleItemResponse = {
  id: string;
  seq: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
  totalDue: string;
  amountPaid: string;
  status: ScheduleItemStatus;
};

export type ContractListResponse = {
  id: string;
  tenantId: string;
  applicationId: string;
  customerId: string;
  imeiUnitId: string;
  status: ContractStatus;
  principal: string;
  downPayment: string;
  financedAmount: string;
  termMonths: number;
  interestMethod: ContractRecord['interestMethod'];
  annualRate: string;
  currency: string;
  activatedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContractDetailResponse = ContractListResponse & {
  version: ContractVersionResponse;
  scheduleItems: PaymentScheduleItemResponse[];
};

@Injectable()
export class ContractsService {
  private static readonly OPEN_CONTRACT_CONFLICT_MESSAGE =
    'Another open contract already exists for this application.';

  constructor(private readonly prisma: PrismaService) {}

  async createFromApplication(
    ctx: TenantContext,
    applicationId: string,
  ): Promise<ContractDetailResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.requireMutateRole(ctx);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const application = await tx.application.findFirst({
          where: {
            id: applicationId,
            tenantId,
          },
          select: {
            id: true,
            tenantId: true,
            customerId: true,
            imeiUnitId: true,
            principal: true,
            downPayment: true,
            termMonths: true,
            interestMethod: true,
            annualRate: true,
            status: true,
          },
        });
        if (!application) {
          throw new NotFoundException('Application not found.');
        }
        if (application.status !== ApplicationStatus.APPROVED) {
          throw new ConflictException('Contract can only be created from APPROVED application.');
        }

        const reservedImei = await tx.imeiUnit.findFirst({
          where: {
            id: application.imeiUnitId,
            tenantId,
            status: ImeiStatus.RESERVED,
          },
          select: { id: true },
        });
        if (!reservedImei) {
          throw new ConflictException('IMEI unit must remain RESERVED before contract create.');
        }

        const existingOpen = await tx.contract.findFirst({
          where: {
            tenantId,
            applicationId: application.id,
            status: { in: [ContractStatus.DRAFT, ContractStatus.ACTIVE] },
          },
          select: { id: true },
        });
        if (existingOpen) {
          throw new ConflictException(ContractsService.OPEN_CONTRACT_CONFLICT_MESSAGE);
        }

        const startDate = new Date().toISOString().slice(0, 10);
        const schedule = generateSchedule({
          interestMethod: application.interestMethod,
          principal: application.principal.toFixed(2),
          downPayment: application.downPayment.toFixed(2),
          annualRate: application.annualRate.toFixed(2),
          termMonths: application.termMonths,
          startDate,
        });

        const financedAmount = application.principal.minus(application.downPayment);
        const contract = await tx.contract.create({
          data: {
            tenantId,
            applicationId: application.id,
            customerId: application.customerId,
            imeiUnitId: application.imeiUnitId,
            status: ContractStatus.DRAFT,
            principal: application.principal,
            downPayment: application.downPayment,
            financedAmount,
            termMonths: application.termMonths,
            interestMethod: application.interestMethod,
            annualRate: application.annualRate,
            currency: 'THB',
          },
        });

        const version = await tx.contractVersion.create({
          data: {
            tenantId,
            contractId: contract.id,
            version: 1,
            termsJson: {
              scheduleVersion: schedule.version,
              financedAmount: schedule.financedAmount,
              interestTotal: schedule.interestTotal,
              startDate,
              termMonths: application.termMonths,
              annualRate: application.annualRate.toFixed(2),
              interestMethod: application.interestMethod,
            },
            scheduleHash: schedule.scheduleHash,
          },
        });

        await tx.paymentScheduleItem.createMany({
          data: schedule.items.map((item) => ({
            tenantId,
            contractId: contract.id,
            contractVersionId: version.id,
            seq: item.seq,
            dueDate: new Date(`${item.dueDate}T00:00:00.000Z`),
            principalDue: new Prisma.Decimal(item.principalDue),
            interestDue: new Prisma.Decimal(item.interestDue),
            feesDue: new Prisma.Decimal(item.feesDue),
            totalDue: new Prisma.Decimal(item.totalDue),
            status: ScheduleItemStatus.PENDING,
          })),
        });

        const scheduleItems = await tx.paymentScheduleItem.findMany({
          where: {
            tenantId,
            contractId: contract.id,
            contractVersionId: version.id,
          },
          orderBy: { seq: 'asc' },
        });

        return { contract, version, scheduleItems };
      });

      return this.toDetailResponse(created.contract, created.version, created.scheduleItems);
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException(ContractsService.OPEN_CONTRACT_CONFLICT_MESSAGE);
      }
      if (error instanceof Error && /principal|down payment|annual rate|termMonths|startDate/i.test(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async list(ctx: TenantContext): Promise<ContractListResponse[]> {
    const tenantId = this.requireTenantId(ctx);
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((contract) => this.toListResponse(contract));
  }

  async getById(ctx: TenantContext, contractId: string): Promise<ContractDetailResponse> {
    const tenantId = this.requireTenantId(ctx);
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        tenantId,
      },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }

    const version = await this.prisma.contractVersion.findFirst({
      where: {
        tenantId,
        contractId: contract.id,
      },
      orderBy: { version: 'desc' },
    });
    if (!version) {
      throw new NotFoundException('Contract version not found.');
    }

    const scheduleItems = await this.prisma.paymentScheduleItem.findMany({
      where: {
        tenantId,
        contractId: contract.id,
        contractVersionId: version.id,
      },
      orderBy: { seq: 'asc' },
    });

    return this.toDetailResponse(contract, version, scheduleItems);
  }

  async activate(ctx: TenantContext, contractId: string): Promise<ContractListResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.requireMutateRole(ctx);

    const updated = await this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({
        where: {
          id: contractId,
          tenantId,
        },
      });
      if (!contract) {
        throw new NotFoundException('Contract not found.');
      }

      const transition = await tx.contract.updateMany({
        where: {
          id: contract.id,
          tenantId,
          status: ContractStatus.DRAFT,
        },
        data: {
          status: ContractStatus.ACTIVE,
          activatedAt: new Date(),
        },
      });
      if (transition.count === 0) {
        throw new ConflictException('Contract can only be activated from DRAFT.');
      }

      const imeiUnit = await tx.imeiUnit.findFirst({
        where: {
          id: contract.imeiUnitId,
          tenantId,
          status: ImeiStatus.RESERVED,
        },
        select: {
          id: true,
          branchId: true,
        },
      });
      if (!imeiUnit) {
        throw new ConflictException('IMEI unit must remain RESERVED before contract activation.');
      }

      const sold = await tx.imeiUnit.updateMany({
        where: {
          id: imeiUnit.id,
          tenantId,
          status: ImeiStatus.RESERVED,
        },
        data: {
          status: ImeiStatus.SOLD,
        },
      });
      if (sold.count === 0) {
        throw new ConflictException('IMEI unit changed by another process. Refresh and retry.');
      }

      await tx.stockMovement.create({
        data: {
          tenantId,
          imeiUnitId: imeiUnit.id,
          type: StockMovementType.SELL,
          fromBranchId: imeiUnit.branchId,
          toBranchId: null,
          actorUserId: ctx.userId,
          reason: `contract:${contract.id}:activated`,
        },
      });

      const updatedContract = await tx.contract.findFirst({
        where: {
          id: contract.id,
          tenantId,
        },
      });
      if (!updatedContract) {
        throw new NotFoundException('Contract not found.');
      }

      return updatedContract;
    });

    return this.toListResponse(updated);
  }

  async cancel(ctx: TenantContext, contractId: string): Promise<ContractListResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.requireMutateRole(ctx);

    const updated = await this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({
        where: {
          id: contractId,
          tenantId,
        },
      });
      if (!contract) {
        throw new NotFoundException('Contract not found.');
      }

      const transition = await tx.contract.updateMany({
        where: {
          id: contract.id,
          tenantId,
          status: ContractStatus.DRAFT,
        },
        data: {
          status: ContractStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      if (transition.count === 0) {
        throw new ConflictException('Contract can only be cancelled from DRAFT.');
      }

      const updatedContract = await tx.contract.findFirst({
        where: {
          id: contract.id,
          tenantId,
        },
      });
      if (!updatedContract) {
        throw new NotFoundException('Contract not found.');
      }

      return updatedContract;
    });

    return this.toListResponse(updated);
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private requireMutateRole(ctx: TenantContext): void {
    if (ctx.role !== PlatformRole.MERCHANT_OWNER && ctx.role !== PlatformRole.MERCHANT_STAFF) {
      throw new ForbiddenException('Only merchant staff can mutate contracts.');
    }
  }

  private toListResponse(contract: ContractRecord): ContractListResponse {
    return {
      id: contract.id,
      tenantId: contract.tenantId,
      applicationId: contract.applicationId,
      customerId: contract.customerId,
      imeiUnitId: contract.imeiUnitId,
      status: contract.status,
      principal: contract.principal.toFixed(2),
      downPayment: contract.downPayment.toFixed(2),
      financedAmount: contract.financedAmount.toFixed(2),
      termMonths: contract.termMonths,
      interestMethod: contract.interestMethod,
      annualRate: contract.annualRate.toFixed(2),
      currency: contract.currency,
      activatedAt: contract.activatedAt,
      cancelledAt: contract.cancelledAt,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  private toDetailResponse(
    contract: ContractRecord,
    version: ContractVersionRecord,
    scheduleItems: ScheduleItemRecord[],
  ): ContractDetailResponse {
    return {
      ...this.toListResponse(contract),
      version: {
        id: version.id,
        version: version.version,
        terms: version.termsJson,
        scheduleHash: version.scheduleHash,
        createdAt: version.createdAt,
      },
      scheduleItems: scheduleItems.map((item) => ({
        id: item.id,
        seq: item.seq,
        dueDate: item.dueDate.toISOString().slice(0, 10),
        principalDue: item.principalDue.toFixed(2),
        interestDue: item.interestDue.toFixed(2),
        feesDue: item.feesDue.toFixed(2),
        totalDue: item.totalDue.toFixed(2),
        amountPaid: item.amountPaid.toFixed(2),
        status: item.status,
      })),
    };
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
