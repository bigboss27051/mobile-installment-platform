import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { KycCaseStatus, KycDocumentType, PlatformRole } from '@prisma/client';
import { OcrProviderPort } from '../common/ocr/ocr-provider.port';
import { ObjectStoragePort } from '../common/storage/object-storage.port';
import { KycService } from './kyc.service';

describe('KycService', () => {
  const prisma = {
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

  it('rejects createCase when an open case already exists', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-open',
      status: KycCaseStatus.SUBMITTED,
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

  it('rejects submit transition from APPROVED', async () => {
    prisma.kycCase.findFirst.mockResolvedValue({
      id: 'case-1',
      tenantId: 'tenant-a',
      customerId: 'customer-1',
      status: KycCaseStatus.APPROVED,
    });

    await expect(service.submit(ctx, 'case-1')).rejects.toBeInstanceOf(ConflictException);
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
});
