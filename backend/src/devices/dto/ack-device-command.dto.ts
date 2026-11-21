import { DeviceCommandStatus, PlatformEnforcementState } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AckDeviceCommandDto {
  @IsEnum(DeviceCommandStatus)
  status!:
    | typeof DeviceCommandStatus.ACKED_SUCCESS
    | typeof DeviceCommandStatus.ACKED_FAILED
    | typeof DeviceCommandStatus.UNSUPPORTED;

  @IsEnum(PlatformEnforcementState)
  platformState!: PlatformEnforcementState;

  @IsOptional()
  @IsString()
  @MinLength(1)
  resultCode?: string;
}
