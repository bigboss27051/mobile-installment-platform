import { Injectable } from '@nestjs/common';
import { OcrAnalyzeInput, OcrProviderPort, OcrSandboxResult } from './ocr-provider.port';

@Injectable()
export class SandboxOcrAdapter implements OcrProviderPort {
  async analyzeIdDocuments(_input: OcrAnalyzeInput): Promise<OcrSandboxResult> {
    return {
      provider: 'sandbox',
      documentPresent: true,
      nameConfidence: 0.92,
      notes: ['sandbox-ocr'],
    };
  }
}
