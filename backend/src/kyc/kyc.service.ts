import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycCaseStatus, KycDocument, KycDocumentType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OCR_PROVIDER, OcrProviderPort } from '../common/ocr/ocr-provider.port';
import { OBJECT_STORAGE, ObjectStoragePort } from '../common/storage/object-storage.port';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export interface AddDocumentInput {
  type: KycDocumentType;
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class KycService {
  private readonly editableStatuses: KycCaseStatus[] = [
    KycCaseStatus.DRAFT,
    KycCaseStatus.NEEDS_RESUBMIT,
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
    @Inject(OCR_PROVIDER) private readonly ocrProvider: OcrProviderPort,
  ) {}

  async createCase(ctx: TenantContext, customerId: string) {
    const tenantId = this.requireTenantId(ctx);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const openCase = await this.prisma.kycCase.findFirst({
      where: {
        tenantId,
        customerId,
        status: {
          in: [
            KycCaseStatus.DRAFT,
            KycCaseStatus.SUBMITTED,
            KycCaseStatus.IN_REVIEW,
            KycCaseStatus.NEEDS_RESUBMIT,
          ],
        },
      },
      select: { id: true },
    });

    if (openCase) {
      throw new ConflictException('Customer already has an open KYC case.');
    }

    return this.prisma.kycCase.create({
      data: {
        tenantId,
        customerId,
        status: KycCaseStatus.DRAFT,
      },
    });
  }

  async addDocument(ctx: TenantContext, caseId: string, input: AddDocumentInput): Promise<KycDocument> {
    const tenantId = this.requireTenantId(ctx);
    const kycCase = await this.getCaseScopedOrThrow(tenantId, caseId);

    if (!this.editableStatuses.includes(kycCase.status)) {
      throw new ConflictException('Documents can only be added in DRAFT or NEEDS_RESUBMIT.');
    }

    const storageKey = `${tenantId}/${kycCase.customerId}/${kycCase.id}/${input.type.toLowerCase()}-${randomUUID()}`;
    await this.objectStorage.putObject(storageKey, input.buffer, input.mimeType);

    return this.prisma.kycDocument.create({
      data: {
        tenantId,
        kycCaseId: caseId,
        type: input.type,
        storageKey,
        mimeType: input.mimeType,
        uploadedByUserId: ctx.userId,
      },
    });
  }

  async submit(ctx: TenantContext, caseId: string) {
    const tenantId = this.requireTenantId(ctx);
    const kycCase = await this.getCaseScopedOrThrow(tenantId, caseId);

    if (!this.editableStatuses.includes(kycCase.status)) {
      throw new ConflictException('Case can only be submitted from DRAFT or NEEDS_RESUBMIT.');
    }

    return this.prisma.kycCase.update({
      where: { id: caseId },
      data: { status: KycCaseStatus.SUBMITTED },
    });
  }

  async runOcr(ctx: TenantContext, caseId: string) {
    const tenantId = this.requireTenantId(ctx);
    const kycCase = await this.prisma.kycCase.findFirst({
      where: {
        id: caseId,
        tenantId,
      },
      include: {
        documents: {
          select: { type: true },
        },
      },
    });

    if (!kycCase) {
      throw new NotFoundException('KYC case not found.');
    }

    if (kycCase.status !== KycCaseStatus.SUBMITTED) {
      throw new ConflictException('OCR can only run for SUBMITTED cases.');
    }

    const ocrResult = await this.ocrProvider.analyzeIdDocuments({
      documentTypes: kycCase.documents.map((doc) => doc.type),
    });

    const ocrSummaryJson = {
      provider: ocrResult.provider,
      documentPresent: ocrResult.documentPresent,
      nameConfidence: ocrResult.nameConfidence,
      notes: ocrResult.notes,
    };

    return this.prisma.kycCase.update({
      where: { id: caseId },
      data: {
        status: KycCaseStatus.IN_REVIEW,
        ocrProvider: ocrResult.provider,
        ocrSummaryJson,
      },
    });
  }

  async getCase(ctx: TenantContext, caseId: string) {
    const tenantId = this.requireTenantId(ctx);
    const kycCase = await this.prisma.kycCase.findFirst({
      where: {
        id: caseId,
        tenantId,
      },
      include: {
        documents: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!kycCase) {
      throw new NotFoundException('KYC case not found.');
    }

    return kycCase;
  }

  private async getCaseScopedOrThrow(tenantId: string, caseId: string) {
    const kycCase = await this.prisma.kycCase.findFirst({
      where: {
        id: caseId,
        tenantId,
      },
    });
    if (!kycCase) {
      throw new NotFoundException('KYC case not found.');
    }
    return kycCase;
  }

  private requireTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return ctx.tenantId;
  }
}
