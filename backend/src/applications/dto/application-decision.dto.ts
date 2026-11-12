import { ApplicationDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplicationDecisionDto {
  @IsEnum(ApplicationDecision)
  decision!: ApplicationDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
