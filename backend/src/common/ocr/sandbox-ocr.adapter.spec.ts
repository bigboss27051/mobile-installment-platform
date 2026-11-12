import { SandboxOcrAdapter } from './sandbox-ocr.adapter';

describe('SandboxOcrAdapter', () => {
  it('returns a safe fixed OCR payload', async () => {
    const adapter = new SandboxOcrAdapter();

    const result = await adapter.analyzeIdDocuments({
      documentTypes: ['thai-national-id-front', 'thai-national-id-back'],
    });

    expect(result).toEqual({
      provider: 'sandbox',
      documentPresent: true,
      nameConfidence: 0.92,
      notes: ['sandbox-ocr'],
    });
    expect(result).not.toHaveProperty('nationalId');
    expect(result).not.toHaveProperty('rawText');
  });
});
