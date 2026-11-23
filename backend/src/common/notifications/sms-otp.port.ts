export interface SendSmsOtpInput {
  tenantId: string;
  phone: string;
  code: string;
}

export interface SmsOtpPort {
  sendOtp(input: SendSmsOtpInput): Promise<void>;
}

export const SMS_OTP = Symbol('SMS_OTP');
