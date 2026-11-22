import { IsString, MinLength } from 'class-validator';

export class ResolveLockApprovalDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
