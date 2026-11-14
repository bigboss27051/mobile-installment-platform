import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BindContractDto {
  @IsUUID()
  contractId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UnbindContractDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsUUID()
  recoveryRequestId?: string;
}
