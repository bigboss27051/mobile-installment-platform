import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { DeviceCheckInService } from './device-check-in.service';
import { CheckInDeviceDto } from './dto/check-in-device.dto';

@Controller('devices')
export class DeviceAgentController {
  constructor(private readonly checkInService: DeviceCheckInService) {}

  @Post('enroll/check-in')
  async checkIn(
    @Body() dto: CheckInDeviceDto,
    @Headers('x-enrollment-token') enrollmentToken: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : undefined;
    const token = enrollmentToken?.trim() || bearer;
    if (!token) {
      throw new BadRequestException('ENROLLMENT_TOKEN_REQUIRED');
    }
    const data = await this.checkInService.checkIn(token, dto);
    return { data };
  }
}
