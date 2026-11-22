import { describe, expect, it } from 'vitest';
import { mipTheme, MIP_TOKENS } from './theme';

describe('mipTheme', () => {
  it('maps compact enterprise palette and shape', () => {
    expect(MIP_TOKENS.primary).toBe('#1d4ed8');
    expect(MIP_TOKENS.text).toBe('#1e293b');
    expect(MIP_TOKENS.bg).toBe('#f8fafc');
    expect(MIP_TOKENS.sidebar).toBe('#1e293b');
    expect(MIP_TOKENS.radius).toBe(6);
    expect(MIP_TOKENS.pageMax).toBe(1200);
    expect(MIP_TOKENS.formMax).toBe(720);
    expect(MIP_TOKENS.loginMax).toBe(420);
    expect(MIP_TOKENS.inputHeight).toBe(44);
    expect(mipTheme.palette.primary.main).toBe('#1d4ed8');
    expect(mipTheme.shape.borderRadius).toBe(6);
  });
});