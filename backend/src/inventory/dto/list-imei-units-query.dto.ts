import { ImeiStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ListImeiUnitsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/)
  imei?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(ImeiStatus)
  status?: ImeiStatus;
}
