import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

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
}
