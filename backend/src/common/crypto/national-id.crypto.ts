import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

export class NationalIdCrypto {
  private static readonly IV_LENGTH = 12;
  private static readonly AES_ALGORITHM = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('NATIONAL_ID_ENCRYPTION_KEY must be at least 32 characters.');
    }

    // Derive a fixed-size key so env secrets can be rotated as strings safely.
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(NationalIdCrypto.IV_LENGTH);
    const cipher = createCipheriv(NationalIdCrypto.AES_ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  decrypt(encrypted: string): string {
    const [ivBase64, tagBase64, cipherBase64] = encrypted.split(':');
    if (!ivBase64 || !tagBase64 || !cipherBase64) {
      throw new Error('Invalid encrypted national ID format.');
    }

    const decipher = createDecipheriv(
      NationalIdCrypto.AES_ALGORITHM,
      this.key,
      Buffer.from(ivBase64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64url'));

    const plain = Buffer.concat([
      decipher.update(Buffer.from(cipherBase64, 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  }

  hash(plain: string): string {
    return createHmac('sha256', this.key).update(plain).digest('hex');
  }

  mask(plainOrLast4: string): string {
    const last4 = plainOrLast4.slice(-4);
    return `****${last4}`;
  }
}
