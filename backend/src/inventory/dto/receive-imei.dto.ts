import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ReceiveImeiDto {
  @IsString()
  @MinLength(1)
  branchId!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsOptional()
  @Matches(/^\d{15}$/)
  imei?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]*$/)
  serial?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
