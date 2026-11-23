import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SendSmsOtpInput, SmsOtpPort } from './sms-otp.port';

/**
 * Placeholder until a real Thai SMS vendor is wired with credentials.
 * Selecting OTP_CHANNEL=sms without a live adapter still boots when SMS_* env
 * placeholders are set, but send always fails with SMS_OTP_BLOCKED.
 */
@Injectable()
export class BlockedSmsAdapter implements SmsOtpPort {
  async sendOtp(_input: SendSmsOtpInput): Promise<void> {
    throw new ServiceUnavailableException('SMS_OTP_BLOCKED');
  }
}
