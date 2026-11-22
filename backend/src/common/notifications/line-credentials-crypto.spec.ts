import { LineCredentialsCrypto } from './line-credentials-crypto';

describe('LineCredentialsCrypto', () => {
  const key = 'replace-with-at-least-32-character-secret';

  it('round-trips encrypt/decrypt', () => {
    const crypto = new LineCredentialsCrypto(key);
    const plain = 'line-channel-secret-value';
    const enc = crypto.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(crypto.decrypt(enc)).toBe(plain);
  });

  it('hashes tokens stably', () => {
    const crypto = new LineCredentialsCrypto(key);
    expect(crypto.hashToken('abc')).toBe(crypto.hashToken('abc'));
    expect(crypto.hashToken('abc')).not.toBe(crypto.hashToken('xyz'));
  });
});
