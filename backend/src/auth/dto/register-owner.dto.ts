import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @IsString()
  @MinLength(2)
  tenantName!: string;

  @IsString()
  @MinLength(2)
  branchCode!: string;

  @IsString()
  @MinLength(2)
  branchName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @IsString()
  @MinLength(2)
  ownerFullName!: string;
}
