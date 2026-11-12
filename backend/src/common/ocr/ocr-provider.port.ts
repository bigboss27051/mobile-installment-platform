export interface OcrAnalyzeInput {
  documentTypes: string[];
}

export interface OcrSandboxResult {
  provider: 'sandbox';
  documentPresent: boolean;
  nameConfidence: number;
  notes: string[];
}

export interface OcrProviderPort {
  analyzeIdDocuments(input: OcrAnalyzeInput): Promise<OcrSandboxResult>;
}

export const OCR_PROVIDER = Symbol('OCR_PROVIDER');
