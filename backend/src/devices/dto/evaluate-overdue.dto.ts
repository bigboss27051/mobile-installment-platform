import { IsString, MinLength } from 'class-validator';

export class EvaluateOverdueDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}