import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { FormField } from './FormField';
import { mipTheme } from './theme';

function wrap(node: ReactNode) {
  return renderToStaticMarkup(<ThemeProvider theme={mipTheme}>{node}</ThemeProvider>);
}

describe('FormField', () => {
  it('shows a required marker and error text', () => {
    const html = wrap(
      <FormField label="Phone" htmlFor="phone" required error="Required">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('Phone');
    expect(html).toContain('*');
    expect(html).toContain('Required');
    expect(html).toContain('role="alert"');
  });

  it('shows helper text when there is no error', () => {
    const html = wrap(
      <FormField label="Phone" htmlFor="phone" helperText="10 digits">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('10 digits');
    expect(html).not.toContain('role="alert"');
  });
});
