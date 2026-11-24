import { IsIn, IsString, Matches } from 'class-validator';

const DECIMAL_MONEY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

export class RecordCollectionDto {
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN)
  amount!: string;

  @IsIn(['CASH', 'TRANSFER'])
  method!: 'CASH' | 'TRANSFER';
}
