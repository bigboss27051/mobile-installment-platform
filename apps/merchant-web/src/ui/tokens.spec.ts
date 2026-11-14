import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'),
  'utf8',
);

describe('UI tokens', () => {
  it('locks page, form, and login max widths', () => {
    expect(tokens).toContain('--mip-page-max: 1200px');
    expect(tokens).toContain('--mip-form-max: 720px');
    expect(tokens).toContain('--mip-login-max: 420px');
  });

  it('extends the 8-point scale through 32px and 48px', () => {
    expect(tokens).toContain('--mip-space-1: 4px');
    expect(tokens).toContain('--mip-space-2: 8px');
    expect(tokens).toContain('--mip-space-3: 12px');
    expect(tokens).toContain('--mip-space-4: 16px');
    expect(tokens).toContain('--mip-space-5: 24px');
    expect(tokens).toContain('--mip-space-6: 32px');
    expect(tokens).toContain('--mip-space-7: 48px');
    expect(tokens).not.toContain('--mip-space-8:');
  });

  it('keeps 44px controls and 6px radius as documented exceptions', () => {
    expect(tokens).toContain('--mip-input-height: 44px');
    expect(tokens).toContain('--mip-radius: 6px');
  });
});
