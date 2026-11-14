import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormField } from './FormField';

describe('FormField', () => {
  it('shows a required marker and error text', () => {
    const html = renderToStaticMarkup(
      <FormField label="Phone" htmlFor="phone" required error="Required">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('Phone');
    expect(html).toContain('*');
    expect(html).toContain('Required');
    expect(html).toContain('mip-field__error');
  });

  it('shows helper text when there is no error', () => {
    const html = renderToStaticMarkup(
      <FormField label="Phone" htmlFor="phone" helperText="10 digits">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('10 digits');
    expect(html).toContain('mip-field__helper');
    expect(html).not.toContain('mip-field__error');
  });
});