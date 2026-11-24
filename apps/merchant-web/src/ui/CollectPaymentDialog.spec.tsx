import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { CollectPaymentForm } from './CollectPaymentDialog';
import { mipTheme } from './theme';

function wrap(node: ReactNode) {
  return renderToStaticMarkup(<ThemeProvider theme={mipTheme}>{node}</ThemeProvider>);
}

const base = {
  title: 'Collect',
  installmentLabel: 'Installment 2',
  amountLabel: 'Amount',
  amount: '50.00',
  amountError: null,
  cashLabel: 'Cash',
  transferLabel: 'Transfer',
  method: 'TRANSFER' as const,
  confirmLabel: 'Confirm receipt',
  cancelLabel: 'Cancel',
  submitting: false,
  canConfirm: true,
  error: null,
  onAmountChange: vi.fn(),
  onMethodChange: vi.fn(),
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('CollectPaymentForm', () => {
  it('shows the installment, both methods, and an enabled confirm action', () => {
    const html = wrap(<CollectPaymentForm {...base} />);
    expect(html).toContain('Collect');
    expect(html).toContain('Installment 2');
    expect(html).toContain('value="50.00"');
    expect(html).toContain('Cash');
    expect(html).toContain('Transfer');
    expect(html).toContain('Confirm receipt');
    expect(html).toContain('aria-pressed="true"');
  });

  it('blocks confirm when the amount is invalid or a submit is in flight', () => {
    const invalid = wrap(
      <CollectPaymentForm {...base} amount="" amountError="Enter an amount" canConfirm={false} />,
    );
    expect(invalid).toContain('Enter an amount');
    expect(invalid).toContain('disabled');

    const pending = wrap(
      <CollectPaymentForm {...base} submitting canConfirm={false} error="Network problem" />,
    );
    expect(pending).toContain('Network problem');
    expect(pending).toContain('disabled');
  });
});