import { createHash, randomBytes } from 'crypto';

export function hashEnrollmentToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function issueEnrollmentToken(): { raw: string; hash: string } {
  const raw = `enc_${randomBytes(32).toString('base64url')}`;
  return { raw, hash: hashEnrollmentToken(raw) };
}
