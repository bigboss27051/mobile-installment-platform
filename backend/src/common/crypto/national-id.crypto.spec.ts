import { NationalIdCrypto } from './national-id.crypto';

describe('NationalIdCrypto', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  let crypto: NationalIdCrypto;

  beforeEach(() => {
    crypto = new NationalIdCrypto(key);
  });

  it('encrypts and decrypts a national ID round-trip', () => {
    const plain = '1234567890123';
    const encrypted = crypto.encrypt(plain);

    expect(encrypted).not.toContain(plain);
    expect(crypto.decrypt(encrypted)).toBe(plain);
  });

  it('hashes deterministically and non-reversibly', () => {
    const plain = '1234567890123';
    const hash = crypto.hash(plain);

    expect(hash).toBe(crypto.hash(plain));
    expect(hash).not.toBe(plain);
  });
});
