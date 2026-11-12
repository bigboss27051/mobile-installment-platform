import { computeScorecard, type ScorecardOutput } from './scorecard';

describe('computeScorecard (r1c-v1)', () => {
  const expectReasonCodes = (output: ScorecardOutput, codes: string[]) => {
    expect(output.reasons.map((r) => r.code)).toEqual(codes);
    for (const reason of output.reasons) {
      expect(reason.message.length).toBeGreaterThan(0);
    }
  };

  describe('invalid money', () => {
    it('rejects non-positive principal', () => {
      expect(() =>
        computeScorecard({ principal: '0', downPayment: '0', termMonths: 6 }),
      ).toThrow(/principal/i);
      expect(() =>
        computeScorecard({ principal: '-100', downPayment: '0', termMonths: 6 }),
      ).toThrow(/principal/i);
    });

    it('rejects negative down payment', () => {
      expect(() =>
        computeScorecard({
          principal: '10000',
          downPayment: '-1',
          termMonths: 6,
        }),
      ).toThrow(/down payment/i);
    });

    it('rejects down payment greater than principal', () => {
      expect(() =>
        computeScorecard({
          principal: '10000',
          downPayment: '10000.01',
          termMonths: 6,
        }),
      ).toThrow(/down payment.*principal/i);
    });
  });

  describe('down-payment ratio', () => {
    it('DP_STRONG when ratio >= 30%', () => {
      const atBoundary = computeScorecard({
        principal: '10000',
        downPayment: '3000',
        termMonths: 24,
      });
      expectReasonCodes(atBoundary, ['DP_STRONG', 'TERM_LONG']);
      expect(atBoundary.score).toBe(80);

      const above = computeScorecard({
        principal: '10000',
        downPayment: '5000',
        termMonths: 24,
      });
      expectReasonCodes(above, ['DP_STRONG', 'TERM_LONG']);
      expect(above.score).toBe(80);
    });

    it('DP_OK when ratio is 20%..30%', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '2500',
        termMonths: 24,
      });
      expectReasonCodes(output, ['DP_OK', 'TERM_LONG']);
      expect(output.score).toBe(65);

      const lower = computeScorecard({
        principal: '10000',
        downPayment: '2000',
        termMonths: 24,
      });
      expectReasonCodes(lower, ['DP_OK', 'TERM_LONG']);
      expect(lower.score).toBe(65);
    });

    it('DP_THIN when ratio is 10%..20%', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '1500',
        termMonths: 24,
      });
      expectReasonCodes(output, ['DP_THIN', 'TERM_LONG']);
      expect(output.score).toBe(50);

      const lower = computeScorecard({
        principal: '10000',
        downPayment: '1000',
        termMonths: 24,
      });
      expectReasonCodes(lower, ['DP_THIN', 'TERM_LONG']);
      expect(lower.score).toBe(50);
    });

    it('DP_WEAK when ratio < 10%', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '999.99',
        termMonths: 24,
      });
      expectReasonCodes(output, ['DP_WEAK', 'TERM_LONG']);
      expect(output.score).toBe(40);

      const zero = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 24,
      });
      expectReasonCodes(zero, ['DP_WEAK', 'TERM_LONG']);
      expect(zero.score).toBe(40);
    });
  });

  describe('term months', () => {
    it('TERM_SHORT when termMonths <= 6', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 6,
      });
      expectReasonCodes(output, ['DP_WEAK', 'TERM_SHORT']);
      expect(output.score).toBe(60);
    });

    it('TERM_MEDIUM when termMonths is 7..12', () => {
      const seven = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 7,
      });
      expectReasonCodes(seven, ['DP_WEAK', 'TERM_MEDIUM']);
      expect(seven.score).toBe(50);

      const twelve = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 12,
      });
      expectReasonCodes(twelve, ['DP_WEAK', 'TERM_MEDIUM']);
      expect(twelve.score).toBe(50);
    });

    it('TERM_LONG when termMonths > 12', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 13,
      });
      expectReasonCodes(output, ['DP_WEAK', 'TERM_LONG']);
      expect(output.score).toBe(40);
    });
  });

  describe('band and clamp', () => {
    it('assigns HIGH when score >= 70', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '3000',
        termMonths: 6,
      });
      expect(output.score).toBe(100);
      expect(output.band).toBe('HIGH');
    });

    it('assigns MEDIUM when score >= 45 and < 70', () => {
      const medium = computeScorecard({
        principal: '10000',
        downPayment: '2500',
        termMonths: 24,
      });
      expect(medium.score).toBe(65);
      expect(medium.band).toBe('MEDIUM');

      const lowerMedium = computeScorecard({
        principal: '10000',
        downPayment: '1000',
        termMonths: 24,
      });
      expect(lowerMedium.score).toBe(50);
      expect(lowerMedium.band).toBe('MEDIUM');
    });

    it('assigns LOW when score < 45', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '0',
        termMonths: 24,
      });
      expect(output.score).toBe(40);
      expect(output.band).toBe('LOW');
    });

    it('clamps score to 0..100', () => {
      const output = computeScorecard({
        principal: '10000',
        downPayment: '3000',
        termMonths: 6,
      });
      expect(output.score).toBeLessThanOrEqual(100);
      expect(output.score).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns version r1c-v1', () => {
    const output = computeScorecard({
      principal: '5000',
      downPayment: '1000',
      termMonths: 10,
    });
    expect(output.version).toBe('r1c-v1');
  });
});
