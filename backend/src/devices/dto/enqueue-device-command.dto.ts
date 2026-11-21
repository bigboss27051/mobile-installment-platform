import { DeviceCommandType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class EnqueueDeviceCommandDto {
  @IsEnum(DeviceCommandType)
  type!: DeviceCommandType;

  @IsString()
  @MinLength(1)
  reason!: string;
}
