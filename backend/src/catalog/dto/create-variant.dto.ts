import { IsString, Matches, MinLength } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  color!: string;

  @IsString()
  @MinLength(1)
  storage!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price!: string;
}
