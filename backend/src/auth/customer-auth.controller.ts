import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service';
import { RequestCustomerOtpDto, VerifyCustomerOtpDto } from './dto/customer-otp.dto';

@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly customerAuth: CustomerAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  async requestOtp(@Body() dto: RequestCustomerOtpDto) {
    const result = await this.customerAuth.requestOtp(dto);
    return { data: result };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyCustomerOtpDto) {
    return this.customerAuth.verifyOtp(dto);
  }
}
