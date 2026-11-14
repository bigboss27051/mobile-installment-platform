import { hashEnrollmentToken, issueEnrollmentToken } from './enrollment-token';

describe('enrollment tokens', () => {
  it('issues a high-entropy token whose hash is SHA-256 hex and not the raw value', () => {
    const issued = issueEnrollmentToken();
    expect(issued.raw.startsWith('enc_')).toBe(true);
    expect(issued.raw.length).toBeGreaterThan(40);
    expect(issued.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(issued.hash).not.toBe(issued.raw);
    expect(hashEnrollmentToken(issued.raw)).toBe(issued.hash);
  });
});
