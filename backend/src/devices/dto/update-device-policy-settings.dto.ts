import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateDevicePolicySettingsDto {
  @IsInt()
  @Min(1)
  @Max(365)
  reminderAfterDays!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  restrictAfterDays!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  lockAfterDays!: number;

  @IsBoolean()
  autoEvaluateCronEnabled!: boolean;

  @IsBoolean()
  requireLockApproval!: boolean;
}
