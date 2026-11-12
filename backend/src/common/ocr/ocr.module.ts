import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OCR_PROVIDER } from './ocr-provider.port';
import { SandboxOcrAdapter } from './sandbox-ocr.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    SandboxOcrAdapter,
    {
      provide: OCR_PROVIDER,
      inject: [ConfigService, SandboxOcrAdapter],
      useFactory: (configService: ConfigService, sandboxOcrAdapter: SandboxOcrAdapter) => {
        const provider = configService.get<string>('OCR_PROVIDER', 'sandbox');
        if (provider === 'sandbox') {
          return sandboxOcrAdapter;
        }

        throw new Error(`Unsupported OCR_PROVIDER value: ${provider}`);
      },
    },
  ],
  exports: [OCR_PROVIDER],
})
export class OcrModule {}
