import { IsString, Matches, MinLength } from 'class-validator';

export class RequestCustomerOtpDto {
  @IsString()
  @MinLength(1)
  tenantSlug!: string;

  @IsString()
  @Matches(/^[0-9]{8,15}$/)
  phone!: string;
}

export class VerifyCustomerOtpDto extends RequestCustomerOtpDto {
  @IsString()
  @Matches(/^[0-9]{4,8}$/)
  code!: string;
}
