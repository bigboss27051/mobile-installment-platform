import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SendLineReminderDto {
  @IsUUID()
  contractId!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
