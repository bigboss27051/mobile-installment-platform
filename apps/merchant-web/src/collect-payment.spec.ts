import { beforeEach, describe, expect, it } from 'vitest';
import {
  canConfirmCollection,
  collectionAmountIssue,
  collectionIdempotencyKey,
  contractOutstanding,
  markCollectionSettled,
  remainingDue,
} from './collect-payment';

describe('collection amount rules', () => {
  it('defaults a row to the unpaid remainder and ignores paid rows in the contract cap', () => {
    expect(remainingDue('50.00', '0.00')).toBe('50.00');
    expect(remainingDue('100.00', '40.50')).toBe('59.50');
    expect(
      contractOutstanding([
        { totalDue: '100.00', amountPaid: '100.00', status: 'PAID' },
        { totalDue: '80.00', amountPaid: '30.00', status: 'PARTIAL' },
      ]),
    ).toBe('50.00');
  });

  it('rejects empty, malformed, zero, and over-outstanding amounts', () => {
    expect(collectionAmountIssue('', '50.00')).toBe('empty');
    expect(collectionAmountIssue('  ', '50.00')).toBe('empty');
    expect(collectionAmountIssue('10.999', '50.00')).toBe('invalid');
    expect(collectionAmountIssue('abc', '50.00')).toBe('invalid');
    expect(collectionAmountIssue('0', '50.00')).toBe('zero');
    expect(collectionAmountIssue('0.00', '50.00')).toBe('zero');
    expect(collectionAmountIssue('50.01', '50.00')).toBe('exceeds');
    expect(collectionAmountIssue('50.00', '50.00')).toBeNull();
    expect(collectionAmountIssue('10.5', '50.00')).toBeNull();
  });

  it('confirms only with a method, a valid amount, and no in-flight submit', () => {
    expect(
      canConfirmCollection({
        amount: '50.00',
        outstanding: '50.00',
        method: 'TRANSFER',
        submitting: false,
      }),
    ).toBe(true);
    expect(
      canConfirmCollection({
        amount: '50.00',
        outstanding: '50.00',
        method: null,
        submitting: false,
      }),
    ).toBe(false);
    expect(
      canConfirmCollection({
        amount: '',
        outstanding: '50.00',
        method: 'CASH',
        submitting: false,
      }),
    ).toBe(false);
    expect(
      canConfirmCollection({
        amount: '50.00',
        outstanding: '50.00',
        method: 'CASH',
        submitting: true,
      }),
    ).toBe(false);
  });
});

describe('collection idempotency key', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reuses the key for a retry and issues a new key after settlement', () => {
    const input = {
      contractId: 'contract-1',
      scheduleItemId: 'item-1',
      amount: '50.00',
      method: 'TRANSFER' as const,
    };
    const first = collectionIdempotencyKey(input);
    expect(collectionIdempotencyKey(input)).toBe(first);
    expect(
      collectionIdempotencyKey({ ...input, method: 'CASH' }),
    ).not.toBe(first);
    const transferAgain = collectionIdempotencyKey(input);
    markCollectionSettled(transferAgain);
    expect(collectionIdempotencyKey(input)).not.toBe(transferAgain);
  });
});
