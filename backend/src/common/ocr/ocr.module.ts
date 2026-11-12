import { Module } from '@nestjs/common';
import { OCR_PROVIDER } from './ocr-provider.port';
import { SandboxOcrAdapter } from './sandbox-ocr.adapter';

@Module({
  providers: [
    {
      provide: OCR_PROVIDER,
      useClass: SandboxOcrAdapter,
    },
  ],
  exports: [OCR_PROVIDER],
})
export class OcrModule {}
