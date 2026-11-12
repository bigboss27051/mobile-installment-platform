import { IsString, Matches } from 'class-validator';

const DECIMAL_MONEY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

export class CreatePaymentIntentDto {
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN)
  amount!: string;
}
