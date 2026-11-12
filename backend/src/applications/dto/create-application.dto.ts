import { IsString, IsUUID, Matches } from 'class-validator';

const DECIMAL_MONEY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

export class CreateApplicationDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  imeiUnitId!: string;

  @IsUUID()
  planId!: string;

  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN)
  principal!: string;

  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN)
  downPayment!: string;
}
