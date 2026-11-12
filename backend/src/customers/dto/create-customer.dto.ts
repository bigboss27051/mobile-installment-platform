import { ConsentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CreateCustomerConsentDto {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsString()
  @MinLength(1)
  version!: string;

  @IsOptional()
  @IsISO8601()
  grantedAt?: string;
}

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @Matches(/^\d{13}$/)
  nationalId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerConsentDto)
  consents?: CreateCustomerConsentDto[];
}
