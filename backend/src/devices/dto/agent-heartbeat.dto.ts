import { DeviceLocationSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AgentHeartbeatLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  accuracyMeters?: number;

  @IsEnum(DeviceLocationSource)
  source!: DeviceLocationSource;

  @IsDateString()
  capturedAt!: string;
}

export class AgentHeartbeatDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  connectivity?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  policyVersion?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentHeartbeatLocationDto)
  location?: AgentHeartbeatLocationDto;
}
