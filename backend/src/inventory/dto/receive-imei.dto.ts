import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ReceiveImeiDto {
  @IsString()
  @MinLength(1)
  branchId!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsString()
  @Matches(/^\d{15}$/)
  imei!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
