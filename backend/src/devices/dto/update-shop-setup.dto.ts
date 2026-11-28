import { IsBoolean } from 'class-validator';

export class UpdateShopSetupDto {
  @IsBoolean()
  dpcAttested!: boolean;

  @IsBoolean()
  googleAccountReady!: boolean;

  @IsBoolean()
  wipeNeedsOnDeviceUnlock!: boolean;

  @IsBoolean()
  noRemoteFrpBypass!: boolean;
}
