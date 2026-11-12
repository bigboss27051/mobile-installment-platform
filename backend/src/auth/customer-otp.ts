import { createHash, timingSafeEqual } from 'crypto';

export function hashCustomerOtp(input: {
  secret: string;
  tenantId: string;
  phone: string;
  code: string;
}): string {
  return createHash('sha256')
    .update(`${input.secret}:${input.tenantId}:${input.phone}:${input.code}`)
    .digest('hex');
}

export function customerOtpMatches(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
