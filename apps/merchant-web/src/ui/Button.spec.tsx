import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { mipTheme } from './theme';

function wrap(node: ReactNode) {
  return renderToStaticMarkup(<ThemeProvider theme={mipTheme}>{node}</ThemeProvider>);
}

describe('Button', () => {
  it('renders children and disables when loading', () => {
    const html = wrap(
      <Button type="button" variant="primary" loading>
        Save
      </Button>,
    );
    expect(html).toContain('Save');
    expect(html).toContain('disabled');
  });
});