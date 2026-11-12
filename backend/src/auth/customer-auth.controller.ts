import { Body, Controller, Post } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { RequestCustomerOtpDto, VerifyCustomerOtpDto } from './dto/customer-otp.dto';

@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly customerAuth: CustomerAuthService) {}

  @Post('otp/request')
  async requestOtp(@Body() dto: RequestCustomerOtpDto) {
    const result = await this.customerAuth.requestOtp(dto);
    return { data: result };
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyCustomerOtpDto) {
    return this.customerAuth.verifyOtp(dto);
  }
}
