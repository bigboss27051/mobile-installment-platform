import { customerOtpMatches, hashCustomerOtp } from './customer-otp';

describe('customer OTP hashing', () => {
  const secret = 'otp-secret';

  it('hashes the same inputs to the same digest', () => {
    const a = hashCustomerOtp({
      secret,
      tenantId: 't1',
      phone: '0811111111',
      code: '123456',
    });
    const b = hashCustomerOtp({
      secret,
      tenantId: 't1',
      phone: '0811111111',
      code: '123456',
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('does not match a different code', () => {
    const expected = hashCustomerOtp({
      secret,
      tenantId: 't1',
      phone: '0811111111',
      code: '123456',
    });
    const actual = hashCustomerOtp({
      secret,
      tenantId: 't1',
      phone: '0811111111',
      code: '000000',
    });
    expect(customerOtpMatches(expected, actual)).toBe(false);
  });

  it('matches equal hashes with constant-time compare', () => {
    const digest = hashCustomerOtp({
      secret,
      tenantId: 't1',
      phone: '0811111111',
      code: '123456',
    });
    expect(customerOtpMatches(digest, digest)).toBe(true);
  });
});
