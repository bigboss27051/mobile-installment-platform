import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpsertLineConfigDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @MinLength(8)
  channelSecret!: string;

  @IsString()
  @MinLength(8)
  accessToken!: string;
}
