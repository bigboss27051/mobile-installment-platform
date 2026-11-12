import { Prisma } from '@prisma/client';

export type ScorecardInput = {
  principal: string;
  downPayment: string;
  termMonths: number;
};

export type ScorecardReason = { code: string; message: string };

export type ScorecardOutput = {
  score: number;
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: ScorecardReason[];
  version: 'r1c-v1';
};

const RATIO_STRONG = new Prisma.Decimal('0.30');
const RATIO_OK = new Prisma.Decimal('0.20');
const RATIO_THIN = new Prisma.Decimal('0.10');

function parseMoney(value: string, label: string): Prisma.Decimal {
  let parsed: Prisma.Decimal;
  try {
    parsed = new Prisma.Decimal(value);
  } catch {
    throw new Error(`Invalid ${label}: must be a decimal string`);
  }
  if (!parsed.isFinite()) {
    throw new Error(`Invalid ${label}: must be a finite decimal`);
  }
  return parsed;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function bandForScore(score: number): ScorecardOutput['band'] {
  if (score >= 70) {
    return 'HIGH';
  }
  if (score >= 45) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export function computeScorecard(input: ScorecardInput): ScorecardOutput {
  const principal = parseMoney(input.principal, 'principal');
  const downPayment = parseMoney(input.downPayment, 'down payment');

  if (principal.lte(0)) {
    throw new Error('principal must be greater than zero');
  }
  if (downPayment.lt(0)) {
    throw new Error('down payment must not be negative');
  }
  if (downPayment.gt(principal)) {
    throw new Error('down payment must not exceed principal');
  }

  const reasons: ScorecardReason[] = [];
  let score = 40;

  const ratio = downPayment.div(principal);

  if (ratio.gte(RATIO_STRONG)) {
    score += 40;
    reasons.push({
      code: 'DP_STRONG',
      message: 'Down payment is at least 30% of principal',
    });
  } else if (ratio.gte(RATIO_OK)) {
    score += 25;
    reasons.push({
      code: 'DP_OK',
      message: 'Down payment is between 20% and 30% of principal',
    });
  } else if (ratio.gte(RATIO_THIN)) {
    score += 10;
    reasons.push({
      code: 'DP_THIN',
      message: 'Down payment is between 10% and 20% of principal',
    });
  } else {
    reasons.push({
      code: 'DP_WEAK',
      message: 'Down payment is below 10% of principal',
    });
  }

  if (input.termMonths <= 6) {
    score += 20;
    reasons.push({
      code: 'TERM_SHORT',
      message: 'Installment term is six months or shorter',
    });
  } else if (input.termMonths <= 12) {
    score += 10;
    reasons.push({
      code: 'TERM_MEDIUM',
      message: 'Installment term is between seven and twelve months',
    });
  } else {
    reasons.push({
      code: 'TERM_LONG',
      message: 'Installment term is longer than twelve months',
    });
  }

  const clamped = clampScore(score);

  return {
    score: clamped,
    band: bandForScore(clamped),
    reasons,
    version: 'r1c-v1',
  };
}
