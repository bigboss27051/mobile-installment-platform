import { KycDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AddKycDocumentDto {
  @IsEnum(KycDocumentType)
  type!: KycDocumentType;
}
