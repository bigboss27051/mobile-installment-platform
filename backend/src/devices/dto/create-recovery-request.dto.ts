import { DeviceRecoveryType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateRecoveryRequestDto {
  @IsEnum(DeviceRecoveryType)
  type!: DeviceRecoveryType;

  @IsString()
  @MinLength(1)
  reason!: string;
}
