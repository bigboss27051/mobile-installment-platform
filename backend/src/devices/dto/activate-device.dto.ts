import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ActivateDeviceDto {
  @IsUUID()
  enrollmentSessionId!: string;

  @IsUUID()
  contractId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  shopCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
