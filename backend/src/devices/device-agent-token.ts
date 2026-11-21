import { createHash, randomBytes } from 'crypto';

export function hashDeviceAgentToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function issueDeviceAgentToken(): { raw: string; hash: string } {
  const raw = `dat_${randomBytes(32).toString('base64url')}`;
  return { raw, hash: hashDeviceAgentToken(raw) };
}
