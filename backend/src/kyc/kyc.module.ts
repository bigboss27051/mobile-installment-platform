import { Module } from '@nestjs/common';
import { OcrModule } from '../common/ocr/ocr.module';
import { StorageModule } from '../common/storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [PrismaModule, StorageModule, OcrModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
