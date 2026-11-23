import { ServiceUnavailableException } from '@nestjs/common';
import { BlockedSmsAdapter } from './blocked-sms.adapter';

describe('BlockedSmsAdapter', () => {
  it('always rejects with SMS_OTP_BLOCKED', async () => {
    const adapter = new BlockedSmsAdapter();
    await expect(
      adapter.sendOtp({
        tenantId: 't1',
        phone: '0811111111',
        code: '654321',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
