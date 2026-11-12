import { allocateFifo, type ScheduleOutstanding } from './allocate-fifo';

function item(
  overrides: Partial<ScheduleOutstanding> & Pick<ScheduleOutstanding, 'id' | 'seq'>,
): ScheduleOutstanding {
  return {
    totalDue: '1000.00',
    amountPaid: '0.00',
    status: 'PENDING',
    ...overrides,
  };
}

describe('allocateFifo', () => {
  it('rejects non-positive payment amount', () => {
    const items = [item({ id: 'a', seq: 1, totalDue: '500.00' })];
    expect(() => allocateFifo(items, '0.00')).toThrow();
    expect(() => allocateFifo(items, '-1.00')).toThrow();
  });

  it('pays exact one installment as PAID', () => {
    const items = [
      item({ id: 'inst-1', seq: 1, totalDue: '1500.00', amountPaid: '0.00' }),
    ];

    const applies = allocateFifo(items, '1500.00');

    expect(applies).toHaveLength(1);
    expect(applies[0]).toEqual({
      scheduleItemId: 'inst-1',
      seq: 1,
      amount: '1500.00',
      nextAmountPaid: '1500.00',
      nextStatus: 'PAID',
    });
  });

  it('allocates across two installments with partial on second', () => {
    const items = [
      item({ id: 'inst-1', seq: 1, totalDue: '500.00' }),
      item({ id: 'inst-2', seq: 2, totalDue: '500.00' }),
    ];

    const applies = allocateFifo(items, '750.00');

    expect(applies).toHaveLength(2);
    expect(applies[0]).toEqual({
      scheduleItemId: 'inst-1',
      seq: 1,
      amount: '500.00',
      nextAmountPaid: '500.00',
      nextStatus: 'PAID',
    });
    expect(applies[1]).toEqual({
      scheduleItemId: 'inst-2',
      seq: 2,
      amount: '250.00',
      nextAmountPaid: '250.00',
      nextStatus: 'PARTIAL',
    });
  });

  it('throws when payment exceeds total outstanding', () => {
    const items = [item({ id: 'inst-1', seq: 1, totalDue: '500.00' })];

    expect(() => allocateFifo(items, '500.01')).toThrow();
    expect(() => allocateFifo(items, '1000.00')).toThrow();
  });

  it('skips PAID items and zero-outstanding rows', () => {
    const items = [
      item({
        id: 'paid',
        seq: 1,
        totalDue: '500.00',
        amountPaid: '500.00',
        status: 'PAID',
      }),
      item({
        id: 'open',
        seq: 2,
        totalDue: '300.00',
        amountPaid: '0.00',
        status: 'PENDING',
      }),
    ];

    const applies = allocateFifo(items, '300.00');

    expect(applies).toHaveLength(1);
    expect(applies[0].scheduleItemId).toBe('open');
    expect(applies[0].nextStatus).toBe('PAID');
  });

  it('processes items in seq order regardless of input order', () => {
    const items = [
      item({ id: 'later', seq: 2, totalDue: '400.00' }),
      item({ id: 'first', seq: 1, totalDue: '100.00' }),
    ];

    const applies = allocateFifo(items, '450.00');

    expect(applies.map((a) => a.seq)).toEqual([1, 2]);
    expect(applies[0].scheduleItemId).toBe('first');
    expect(applies[1].scheduleItemId).toBe('later');
    expect(applies[1].nextStatus).toBe('PARTIAL');
  });
});
