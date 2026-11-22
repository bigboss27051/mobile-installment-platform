import { NationalIdCrypto } from '../crypto/national-id.crypto';

/** Reuse AES-GCM envelope for LINE channel secrets (same format as national ID crypto). */
export class LineCredentialsCrypto {
  private readonly inner: NationalIdCrypto;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'LINE_CREDENTIALS_ENCRYPTION_KEY (or NATIONAL_ID_ENCRYPTION_KEY fallback) must be at least 32 characters.',
      );
    }
    this.inner = new NationalIdCrypto(secret);
  }

  encrypt(plain: string): string {
    return this.inner.encrypt(plain);
  }

  decrypt(encrypted: string): string {
    return this.inner.decrypt(encrypted);
  }

  hashToken(plain: string): string {
    return this.inner.hash(plain);
  }
}
