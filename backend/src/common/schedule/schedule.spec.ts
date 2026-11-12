import { generateSchedule } from './schedule';

type DueFields = {
  principalDue: string;
  interestDue: string;
  totalDue: string;
};

function sum(items: string[]): string {
  const total = items.reduce((acc, value) => acc + Number(value), 0);
  return total.toFixed(2);
}

describe('generateSchedule (r1d-v1)', () => {
  describe('invalid money and term', () => {
    it('rejects non-positive principal', () => {
      expect(() =>
        generateSchedule({
          interestMethod: 'FLAT',
          principal: '0.00',
          downPayment: '0.00',
          annualRate: '12.00',
          termMonths: 6,
          startDate: '2026-01-15',
        }),
      ).toThrow(/principal/i);
    });

    it('rejects negative down payment', () => {
      expect(() =>
        generateSchedule({
          interestMethod: 'FLAT',
          principal: '12000.00',
          downPayment: '-1.00',
          annualRate: '12.00',
          termMonths: 6,
          startDate: '2026-01-15',
        }),
      ).toThrow(/down payment/i);
    });

    it('rejects down payment equal to principal', () => {
      expect(() =>
        generateSchedule({
          interestMethod: 'FLAT',
          principal: '12000.00',
          downPayment: '12000.00',
          annualRate: '12.00',
          termMonths: 6,
          startDate: '2026-01-15',
        }),
      ).toThrow(/down payment.*principal/i);
    });

    it('rejects term less than one month', () => {
      expect(() =>
        generateSchedule({
          interestMethod: 'REDUCING',
          principal: '12000.00',
          downPayment: '2000.00',
          annualRate: '12.00',
          termMonths: 0,
          startDate: '2026-01-15',
        }),
      ).toThrow(/term/i);
    });
  });

  it('matches FLAT golden totals and sum checks', () => {
    const output = generateSchedule({
      interestMethod: 'FLAT',
      principal: '12000.00',
      downPayment: '2000.00',
      annualRate: '12.00',
      termMonths: 6,
      startDate: '2026-01-15',
    });

    expect(output.version).toBe('r1d-v1');
    expect(output.financedAmount).toBe('10000.00');
    expect(output.interestTotal).toBe('600.00');
    expect(output.items).toHaveLength(6);
    expect(output.items[0]?.totalDue).toBe('1766.67');
    expect(sum(output.items.map((x: DueFields) => x.totalDue))).toBe('10600.00');
    expect(sum(output.items.map((x: DueFields) => x.principalDue))).toBe(
      '10000.00',
    );
    expect(sum(output.items.map((x: DueFields) => x.interestDue))).toBe(
      '600.00',
    );
    for (const item of output.items) {
      expect(item.feesDue).toBe('0.00');
      expect(item.principalDue).toMatch(/^\d+\.\d{2}$/);
      expect(item.interestDue).toMatch(/^\d+\.\d{2}$/);
      expect(item.totalDue).toMatch(/^\d+\.\d{2}$/);
    }
  });

  it('matches REDUCING golden totals and stable hash', () => {
    const input = {
      interestMethod: 'REDUCING' as const,
      principal: '11000.00',
      downPayment: '1000.00',
      annualRate: '18.00',
      termMonths: 12,
      startDate: '2026-01-01',
    };

    const outputA = generateSchedule(input);
    const outputB = generateSchedule(input);

    expect(outputA.version).toBe('r1d-v1');
    expect(outputA.financedAmount).toBe('10000.00');
    expect(outputA.items).toHaveLength(12);
    expect(sum(outputA.items.map((x: DueFields) => x.principalDue))).toBe(
      '10000.00',
    );
    expect(sum(outputA.items.map((x: DueFields) => x.interestDue))).toBe(
      outputA.interestTotal,
    );
    expect(Number(outputA.interestTotal)).toBeGreaterThan(0);
    for (const item of outputA.items) {
      expect(item.feesDue).toBe('0.00');
      expect(item.principalDue).toMatch(/^\d+\.\d{2}$/);
      expect(item.interestDue).toMatch(/^\d+\.\d{2}$/);
      expect(item.totalDue).toMatch(/^\d+\.\d{2}$/);
    }
    expect(outputA.scheduleHash).toBe(outputB.scheduleHash);
  });
});
