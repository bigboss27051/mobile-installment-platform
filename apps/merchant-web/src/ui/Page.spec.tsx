import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { Page } from './Page';
import { mipTheme } from './theme';

describe('Page', () => {
  it('renders the page title', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={mipTheme}>
        <Page title="Customers">
          <p>body</p>
        </Page>
      </ThemeProvider>,
    );
    expect(html).toContain('Customers');
    expect(html).toContain('body');
    expect(html).toMatch(/<h1[^>]*>Customers<\/h1>/);
  });
});
