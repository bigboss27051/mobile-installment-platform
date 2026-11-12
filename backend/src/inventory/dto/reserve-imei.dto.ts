import { IsOptional, IsString, MinLength } from 'class-validator';

export class ReserveImeiDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
