import { KycReviewDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class ReviewKycCaseDto {
  @IsEnum(KycReviewDecision)
  decision!: KycReviewDecision;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
