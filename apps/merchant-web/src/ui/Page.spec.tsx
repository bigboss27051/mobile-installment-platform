import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Page } from './Page';

describe('Page', () => {
  it('renders the page title', () => {
    const html = renderToStaticMarkup(
      <Page title="Customers">
        <p>body</p>
      </Page>,
    );
    expect(html).toContain('Customers');
    expect(html).toContain('mip-page');
    expect(html).toContain('mip-page__title');
    expect(html).toContain('body');
  });
});