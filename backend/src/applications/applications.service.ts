import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationDecision,
  ApplicationStatus,
  InterestMethod,
  KycCaseStatus,
  PlatformRole,
  Prisma,
  ScorecardBand,
} from '@prisma/client';
import { computeScorecard } from '../common/scorecard/scorecard';
import { InventoryService } from '../inventory/inventory.service';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationDecisionDto } from './dto/application-decision.dto';

type ScorecardResponse = {
  score: number;
  band: ScorecardBand;
  reasons: unknown;
  version: string;
  createdAt: Date;
};

export type ApplicationResponse = {
  id: string;
  tenantId: string;
  customerId: string;
  imeiUnitId: string;
  planId: string;
  principal: string;
  downPayment: string;
  termMonths: number;
  interestMethod: InterestMethod;
  annualRate: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  scorecard: ScorecardResponse | null;
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}
  private static readonly OPEN_IMEI_CONFLICT_MESSAGE =
    'Another open application already exists for this IMEI unit.';

  async create(ctx: TenantContext, input: CreateApplicationDto): Promise<ApplicationResponse> {
    const tenantId = this.requireTenantId(ctx);
    const principal = this.parseMoney(input.principal, 'principal');
    const downPayment = this.parseMoney(input.downPayment, 'downPayment');

    if (principal.lte(0)) {
      throw new BadRequestException('principal must be greater than zero.');
    }
    if (downPayment.lt(0)) {
      throw new BadRequestException('downPayment must be zero or greater.');
    }
    if (downPayment.gt(principal)) {
      throw new BadRequestException('downPayment must be less than or equal to principal.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: input.customerId,
        tenantId,
      },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const plan = await this.prisma.installmentPlan.findFirst({
      where: {
        id: input.planId,
        tenantId,
        active: true,
      },
      select: {
        id: true,
        termMonths: true,
        interestMethod: true,
        annualRate: true,
      },
    });
    if (!plan) {
      throw new NotFoundException('Installment plan not found.');
    }

    const imeiUnit = await this.prisma.imeiUnit.findFirst({
      where: {
        id: input.imeiUnitId,
        tenantId,
      },
      select: { id: true },
    });
    if (!imeiUnit) {
      throw new NotFoundException('IMEI unit not found.');
    }

    const existingOpen = await this.prisma.application.findFirst({
      where: {
        tenantId,
        imeiUnitId: input.imeiUnitId,
        status: {
          in: [ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED],
        },
      },
      select: { id: true },
    });
    if (existingOpen) {
      throw new ConflictException(ApplicationsService.OPEN_IMEI_CONFLICT_MESSAGE);
    }

    let application: Prisma.ApplicationGetPayload<{ include: { scorecard: true } }>;
    try {
      application = await this.prisma.application.create({
        data: {
          tenantId,
          customerId: input.customerId,
          imeiUnitId: input.imeiUnitId,
          planId: plan.id,
          principal,
          downPayment,
          termMonths: plan.termMonths,
          interestMethod: plan.interestMethod,
          annualRate: plan.annualRate,
          status: ApplicationStatus.DRAFT,
        },
        include: { scorecard: true },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException(ApplicationsService.OPEN_IMEI_CONFLICT_MESSAGE);
      }
      throw error;
    }

    return this.toResponse(application);
  }

  async list(ctx: TenantContext): Promise<ApplicationResponse[]> {
    const tenantId = this.requireTenantId(ctx);
    const applications = await this.prisma.application.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { scorecard: true },
    });

    return applications.map((application) => this.toResponse(application));
  }

  async getById(ctx: TenantContext, applicationId: string): Promise<ApplicationResponse> {
    const tenantId = this.requireTenantId(ctx);
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: { scorecard: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    return this.toResponse(application);
  }

  async submit(ctx: TenantContext, applicationId: string): Promise<ApplicationResponse> {
    const tenantId = this.requireTenantId(ctx);
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: { scorecard: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ConflictException('Application can only be submitted from DRAFT.');
    }

    const approvedKyc = await this.prisma.kycCase.findFirst({
      where: {
        tenantId,
        customerId: application.customerId,
        status: KycCaseStatus.APPROVED,
      },
      select: { id: true },
    });
    if (!approvedKyc) {
      throw new ConflictException('Customer must have an approved KYC case before submit.');
    }

    await this.inventory.reserve(ctx, application.imeiUnitId, {
      reason: `application:${application.id}`,
    });

    let scorecard: ReturnType<typeof computeScorecard>;
    try {
      scorecard = computeScorecard({
        principal: application.principal.toFixed(2),
        downPayment: application.downPayment.toFixed(2),
        termMonths: application.termMonths,
      });
    } catch (error: unknown) {
      try {
        await this.inventory.release(ctx, application.imeiUnitId, {
          reason: `application:${application.id}:compensation`,
        });
      } catch (_releaseError: unknown) {
        // Best-effort compensation; preserve compute error details.
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unable to compute scorecard.',
      );
    }

    try {
      const updated = await this.prisma.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.SUBMITTED,
          submittedAt: new Date(),
          scorecard: {
            create: {
              tenantId,
              score: scorecard.score,
              band: scorecard.band,
              reasonsJson: scorecard.reasons,
              version: scorecard.version,
            },
          },
        },
        include: { scorecard: true },
      });

      return this.toResponse(updated);
    } catch (error: unknown) {
      try {
        await this.inventory.release(ctx, application.imeiUnitId, {
          reason: `application:${application.id}:compensation`,
        });
      } catch (_releaseError: unknown) {
        // Best-effort compensation; preserve the original DB failure.
      }
      throw error;
    }
  }

  async decision(
    ctx: TenantContext,
    applicationId: string,
    input: ApplicationDecisionDto,
  ): Promise<ApplicationResponse> {
    const tenantId = this.requireTenantId(ctx);
    this.requireDecisionRole(ctx);
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: { scorecard: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }
    if (application.status !== ApplicationStatus.SUBMITTED) {
      throw new ConflictException('Application can only be decided from SUBMITTED.');
    }

    const nextStatus =
      input.decision === ApplicationDecision.APPROVE
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: nextStatus,
          decidedAt: new Date(),
        },
        include: { scorecard: true },
      });

      await tx.approvalAction.create({
        data: {
          tenantId,
          applicationId: application.id,
          actorUserId: ctx.userId,
          decision: input.decision,
          reason: input.reason,
        },
      });

      return updatedApplication;
    });

    if (nextStatus === ApplicationStatus.REJECTED) {
      await this.inventory.release(ctx, application.imeiUnitId, {
        reason: `application:${application.id}:rejected`,
      });
    }

    return this.toResponse(updated);
  }

  async cancel(ctx: TenantContext, applicationId: string): Promise<ApplicationResponse> {
    const tenantId = this.requireTenantId(ctx);
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
      include: { scorecard: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.SUBMITTED
    ) {
      throw new ConflictException('Application can only be cancelled from DRAFT or SUBMITTED.');
    }

    const updated = await this.prisma.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.CANCELLED,
        decidedAt: new Date(),
      },
      include: { scorecard: true },
    });

    if (application.status === ApplicationStatus.SUBMITTED) {
      await this.inventory.release(ctx, application.imeiUnitId, {
        reason: `application:${application.id}:cancelled`,
      });
    }

    return this.toResponse(updated);
  }

  private toResponse(
    application: Prisma.ApplicationGetPayload<{ include: { scorecard: true } }>,
  ): ApplicationResponse {
    return {
      id: application.id,
      tenantId: application.tenantId,
      customerId: application.customerId,
      imeiUnitId: application.imeiUnitId,
      planId: application.planId,
      principal: application.principal.toFixed(2),
      downPayment: application.downPayment.toFixed(2),
      termMonths: application.termMonths,
      interestMethod: application.interestMethod,
      annualRate: application.annualRate.toFixed(2),
      status: application.status,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      scorecard: application.scorecard
        ? {
            score: application.scorecard.score,
            band: application.scorecard.band,
            reasons: application.scorecard.reasonsJson,
            version: application.scorecard.version,
            createdAt: application.scorecard.createdAt,
          }
        : null,
    };
  }

  private parseMoney(value: string, fieldName: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch (_error: unknown) {
      throw new BadRequestException(`${fieldName} must be a valid decimal string.`);
    }
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return ctx.tenantId;
  }

  private requireDecisionRole(ctx: TenantContext): void {
    if (ctx.role !== PlatformRole.MERCHANT_OWNER && ctx.role !== PlatformRole.MERCHANT_STAFF) {
      throw new ForbiddenException('Only merchant staff can decide applications.');
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
