import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  KycCaseStatus,
  KycDocumentType,
  KycReviewDecision,
  PlatformRole,
} from '@prisma/client';
import { OcrProviderPort } from '../common/ocr/ocr-provider.port';
import { ObjectStoragePort } from '../common/storage/object-storage.port';
import { KycService } from './kyc.service';

describe('KycService', () => {
  const tx = {
    kycCase: {
      update: jest.fn(),
    },
    kycReviewAction: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    customer: {
      findFirst: jest.fn(),
    },
    kycCase: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    kycDocument: {
      create: jest.fn(),
    },
    kycReviewAction: {
      create: jest.fn(),
    },
  };

  const objectStorage: ObjectStoragePort = {
    putObject: jest.fn(),
    getObject: jest.fn(),
  };

  const ocrProvider: OcrProviderPort = {
    analyzeIdDocuments: jest.fn(),
  };

  const service = new KycService(
    prisma as never,
    objectStorage,
    ocrProvider,
  );

  const ctx = {
    tenantId: 'tenant-a',
    userId: 'user-1',
    role: PlatformRole.MERCHANT_OWNER,
  };

  const noTenantCtx = {
    tenantId: null,
    userId: 'admin-1',
    role: PlatformRole.SUPER_ADMIN,
  };

  const staffCtx = {
    tenantId: 'tenant-a',
    userId: 'staff-1',
    role: PlatformRole.MERCHANT_STAFF,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects createCase without tenant context', async () => {
    await expect(service.createCase(noTenantCtx, 'customer-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects createCase when customer is outside tenant scope', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);

    await expect(service.createCase(ctx, 'customer-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    KycCaseStatus.DRAFT,
    KycCaseStatus.SUBMITTED,
    KycCaseStatus.IN_REVIEW,
    KycCaseStatus.NEEDS_RESUBMIT,
  ])('rejects createCase when open case status is %s', async (openStatus) => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-open',
      status: openStatus,
    });

    await expect(service.createCase(ctx, 'customer-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a DRAFT case when no open case exists', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.kycCase.findFirst.mockResolvedValue(null);
    prisma.kycCase.create.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.DRAFT,
    });

    await expect(service.createCase(ctx, 'customer-1')).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.DRAFT,
    });
  });

  it('allows addDocument only in DRAFT or NEEDS_RESUBMIT', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.SUBMITTED,
    });

    await expect(
      service.addDocument(ctx, 'case-1', {
        type: KycDocumentType.ID_FRONT,
        buffer: Buffer.from('file'),
        mimeType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects addDocument without tenant context', async () => {
    await expect(
      service.addDocument(noTenantCtx, 'case-1', {
        type: KycDocumentType.ID_FRONT,
        buffer: Buffer.from('file'),
        mimeType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uploads object and creates KycDocument row', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.DRAFT,
    });
    prisma.kycDocument.create.mockResolvedValue({
      id: 'doc-1',
      kycCaseId: 'case-1',
      type: KycDocumentType.ID_FRONT,
      storageKey: 'tenant-a/customer-1/case-1/id-front',
      mimeType: 'image/jpeg',
    });

    await expect(
      service.addDocument(ctx, 'case-1', {
        type: KycDocumentType.ID_FRONT,
        buffer: Buffer.from('file'),
        mimeType: 'image/jpeg',
      }),
    ).resolves.toMatchObject({
      id: 'doc-1',
      kycCaseId: 'case-1',
    });

    expect(objectStorage.putObject).toHaveBeenCalled();
    expect(prisma.kycDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-a',
          kycCaseId: 'case-1',
          type: KycDocumentType.ID_FRONT,
          uploadedByUserId: 'user-1',
        }),
      }),
    );
  });

  it('uploads object and creates KycDocument row for NEEDS_RESUBMIT', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.NEEDS_RESUBMIT,
    });
    prisma.kycDocument.create.mockResolvedValue({
      id: 'doc-2',
      kycCaseId: 'case-1',
      type: KycDocumentType.ID_BACK,
      storageKey: 'tenant-a/customer-1/case-1/id-back',
      mimeType: 'image/jpeg',
    });

    await expect(
      service.addDocument(ctx, 'case-1', {
        type: KycDocumentType.ID_BACK,
        buffer: Buffer.from('file'),
        mimeType: 'image/jpeg',
      }),
    ).resolves.toMatchObject({
      id: 'doc-2',
      kycCaseId: 'case-1',
      type: KycDocumentType.ID_BACK,
    });
  });

  it('transitions submit from DRAFT to SUBMITTED', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.DRAFT,
    });
    prisma.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.SUBMITTED,
    });

    await expect(service.submit(ctx, 'case-1')).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.SUBMITTED,
    });
  });

  it('rejects submit without tenant context', async () => {
    await expect(service.submit(noTenantCtx, 'case-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transitions submit from NEEDS_RESUBMIT to SUBMITTED', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.NEEDS_RESUBMIT,
    });
    prisma.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.SUBMITTED,
    });

    await expect(service.submit(ctx, 'case-1')).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.SUBMITTED,
    });
  });

  it('rejects submit transition from APPROVED', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.APPROVED,
    });

    await expect(service.submit(ctx, 'case-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects runOcr without tenant context', async () => {
    await expect(service.runOcr(noTenantCtx, 'case-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('runs OCR on SUBMITTED case and transitions to IN_REVIEW', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.SUBMITTED,
      documents: [{ type: KycDocumentType.ID_FRONT }, { type: KycDocumentType.SELFIE }],
    });
    (ocrProvider.analyzeIdDocuments as jest.Mock).mockResolvedValue({
      provider: 'sandbox',
      documentPresent: true,
      nameConfidence: 0.92,
      notes: ['sandbox-ocr'],
    });
    prisma.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.IN_REVIEW,
    });

    await expect(service.runOcr(ctx, 'case-1')).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.IN_REVIEW,
    });

    expect(ocrProvider.analyzeIdDocuments).toHaveBeenCalledWith({
      documentTypes: [KycDocumentType.ID_FRONT, KycDocumentType.SELFIE],
    });
    expect(prisma.kycCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: KycCaseStatus.IN_REVIEW,
          ocrProvider: 'sandbox',
          ocrSummaryJson: expect.objectContaining({
            provider: 'sandbox',
            documentPresent: true,
          }),
        }),
      }),
    );
  });

  it('rejects OCR unless case is SUBMITTED', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.DRAFT,
      documents: [],
    });

    await expect(service.runOcr(ctx, 'case-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects getCase without tenant context', async () => {
    await expect(service.getCase(noTenantCtx, 'case-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gets case by id within tenant scope', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.DRAFT,
      documents: [],
    });

    await expect(service.getCase(ctx, 'case-1')).resolves.toMatchObject({
      id: 'case-1',
      tenantId: 'tenant-a',
    });
  });

  it('throws on getCase when not found in tenant', async () => {
    prisma.kycCase.findFirst.mockResolvedValue(null);

    await expect(service.getCase(ctx, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('approves case from IN_REVIEW and appends audit action', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.IN_REVIEW,
    });
    tx.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.APPROVED,
    });
    tx.kycReviewAction.create.mockResolvedValue({
      id: 'audit-1',
      decision: KycReviewDecision.APPROVE,
    });

    await expect(
      service.review(ctx, 'case-1', {
        decision: KycReviewDecision.APPROVE,
      }),
    ).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.APPROVED,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kycReviewAction.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        kycCaseId: 'case-1',
        actorUserId: 'user-1',
        decision: KycReviewDecision.APPROVE,
        reason: undefined,
      },
    });
  });

  it('rejects case from IN_REVIEW and appends audit action with reason', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.IN_REVIEW,
    });
    tx.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.REJECTED,
    });
    tx.kycReviewAction.create.mockResolvedValue({
      id: 'audit-2',
      decision: KycReviewDecision.REJECT,
      reason: 'ID mismatch',
    });

    await expect(
      service.review(staffCtx, 'case-1', {
        decision: KycReviewDecision.REJECT,
        reason: 'ID mismatch',
      }),
    ).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.REJECTED,
    });

    expect(tx.kycReviewAction.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        kycCaseId: 'case-1',
        actorUserId: 'staff-1',
        decision: KycReviewDecision.REJECT,
        reason: 'ID mismatch',
      },
    });
  });

  it('requests resubmit from IN_REVIEW and appends audit action', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.IN_REVIEW,
    });
    tx.kycCase.update.mockResolvedValue({
      id: 'case-1',
      status: KycCaseStatus.NEEDS_RESUBMIT,
    });
    tx.kycReviewAction.create.mockResolvedValue({
      id: 'audit-3',
      decision: KycReviewDecision.REQUEST_RESUBMIT,
    });

    await expect(
      service.review(ctx, 'case-1', {
        decision: KycReviewDecision.REQUEST_RESUBMIT,
      }),
    ).resolves.toMatchObject({
      id: 'case-1',
      status: KycCaseStatus.NEEDS_RESUBMIT,
    });

    expect(tx.kycReviewAction.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        kycCaseId: 'case-1',
        actorUserId: 'user-1',
        decision: KycReviewDecision.REQUEST_RESUBMIT,
        reason: undefined,
      },
    });
  });

  it.each([
    KycCaseStatus.DRAFT,
    KycCaseStatus.SUBMITTED,
    KycCaseStatus.APPROVED,
    KycCaseStatus.REJECTED,
    KycCaseStatus.NEEDS_RESUBMIT,
  ])('rejects review when case status is %s', async (status) => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status,
    });

    await expect(
      service.review(ctx, 'case-1', {
        decision: KycReviewDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.kycReviewAction.create).not.toHaveBeenCalled();
  });

  it('rejects review without tenant context', async () => {
    await expect(
      service.review(noTenantCtx, 'case-1', {
        decision: KycReviewDecision.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects review for unauthorized role', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.IN_REVIEW,
    });

    await expect(
      service.review(
        {
          tenantId: 'tenant-a',
          userId: 'admin-1',
          role: PlatformRole.SUPER_ADMIN,
        },
        'case-1',
        { decision: KycReviewDecision.APPROVE },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
