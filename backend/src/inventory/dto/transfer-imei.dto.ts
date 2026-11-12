import { IsOptional, IsString, MinLength } from 'class-validator';

export class TransferImeiDto {
  @IsString()
  @MinLength(1)
  toBranchId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
