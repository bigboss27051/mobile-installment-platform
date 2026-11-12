import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

import { d, roundHalfUp2 } from './money';

export type ScheduleInput = {
  interestMethod: 'FLAT' | 'REDUCING';
  principal: string;
  downPayment: string;
  annualRate: string;
  termMonths: number;
  startDate: string;
};

export type ScheduleItem = {
  seq: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
  totalDue: string;
};

export type ScheduleOutput = {
  version: 'r1d-v1';
  financedAmount: string;
  interestTotal: string;
  items: ScheduleItem[];
  scheduleHash: string;
};

const ZERO = d('0');
const ONE = d('1');
const HUNDRED = d('100');
const TWELVE = d('12');

function parseDecimal(value: string, label: string): Prisma.Decimal {
  let parsed: Prisma.Decimal;
  try {
    parsed = d(value);
  } catch {
    throw new Error(`Invalid ${label}: must be a decimal string`);
  }
  if (!parsed.isFinite()) {
    throw new Error(`Invalid ${label}: must be a finite decimal`);
  }
  return parsed;
}

function toMoneyString(value: Prisma.Decimal): string {
  return roundHalfUp2(value).toFixed(2);
}

function parseStartDate(startDate: string): {
  year: number;
  monthZeroBased: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) {
    throw new Error('startDate must be YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isValid) {
    throw new Error('startDate must be a valid UTC date');
  }
  return { year, monthZeroBased: month - 1, day };
}

function daysInMonthUtc(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

function addMonthsClamped(startDate: string, monthsToAdd: number): string {
  const { year, monthZeroBased, day } = parseStartDate(startDate);
  const absoluteMonth = monthZeroBased + monthsToAdd;
  const targetYear = year + Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;
  const targetDay = Math.min(day, daysInMonthUtc(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, targetDay))
    .toISOString()
    .slice(0, 10);
}

export function hashSchedule(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function generateSchedule(input: ScheduleInput): ScheduleOutput {
  const principal = parseDecimal(input.principal, 'principal');
  const downPayment = parseDecimal(input.downPayment, 'down payment');
  const annualRate = parseDecimal(input.annualRate, 'annual rate');
  const termMonths = input.termMonths;

  if (principal.lte(ZERO)) {
    throw new Error('principal must be greater than zero');
  }
  if (downPayment.lt(ZERO)) {
    throw new Error('down payment must not be negative');
  }
  if (downPayment.gte(principal)) {
    throw new Error('down payment must be less than principal');
  }
  if (!Number.isInteger(termMonths) || termMonths < 1) {
    throw new Error('termMonths must be at least 1');
  }

  parseStartDate(input.startDate);

  const financed = principal.minus(downPayment);
  const items: ScheduleItem[] = [];
  const n = termMonths;
  const nDecimal = d(n);
  const monthlyRate = annualRate.div(HUNDRED).div(TWELVE);

  let interestTotal = ZERO;

  if (input.interestMethod === 'FLAT') {
    const grossInterest = financed
      .mul(annualRate.div(HUNDRED))
      .mul(nDecimal.div(TWELVE));
    interestTotal = roundHalfUp2(grossInterest);

    const grandTotal = financed.plus(interestTotal);
    const baseTotalDue = roundHalfUp2(grandTotal.div(nDecimal));
    const baseInterestDue = roundHalfUp2(interestTotal.div(nDecimal));

    let totalAcc = ZERO;
    let interestAcc = ZERO;
    let principalAcc = ZERO;

    for (let seq = 1; seq <= n; seq += 1) {
      const isLast = seq === n;
      const totalDue = isLast ? grandTotal.minus(totalAcc) : baseTotalDue;
      const interestDue = isLast
        ? interestTotal.minus(interestAcc)
        : baseInterestDue;
      let principalDue = totalDue.minus(interestDue);

      if (isLast) {
        principalDue = financed.minus(principalAcc);
      }

      totalAcc = totalAcc.plus(totalDue);
      interestAcc = interestAcc.plus(interestDue);
      principalAcc = principalAcc.plus(principalDue);

      items.push({
        seq,
        dueDate: addMonthsClamped(input.startDate, seq),
        principalDue: toMoneyString(principalDue),
        interestDue: toMoneyString(interestDue),
        feesDue: '0.00',
        totalDue: toMoneyString(totalDue),
      });
    }
  } else {
    const pmt =
      monthlyRate.eq(ZERO)
        ? roundHalfUp2(financed.div(nDecimal))
        : roundHalfUp2(
            financed
              .mul(monthlyRate)
              .mul(ONE.plus(monthlyRate).pow(n))
              .div(ONE.plus(monthlyRate).pow(n).minus(ONE)),
          );

    let remaining = financed;
    let interestAcc = ZERO;

    for (let seq = 1; seq <= n; seq += 1) {
      const isLast = seq === n;

      const interestDue = roundHalfUp2(remaining.mul(monthlyRate));
      let principalDue = isLast ? remaining : pmt.minus(interestDue);
      if (!isLast && principalDue.gt(remaining)) {
        principalDue = remaining;
      }

      const totalDue = principalDue.plus(interestDue);

      if (!isLast) {
        remaining = remaining.minus(principalDue);
      }
      interestAcc = interestAcc.plus(interestDue);

      items.push({
        seq,
        dueDate: addMonthsClamped(input.startDate, seq),
        principalDue: toMoneyString(principalDue),
        interestDue: toMoneyString(interestDue),
        feesDue: '0.00',
        totalDue: toMoneyString(totalDue),
      });
    }

    interestTotal = roundHalfUp2(interestAcc);
  }

  const financedAmount = toMoneyString(financed);
  const canonical = {
    version: 'r1d-v1' as const,
    interestMethod: input.interestMethod,
    financedAmount,
    annualRate: toMoneyString(annualRate),
    termMonths: n,
    items: items.map((item) => ({
      seq: item.seq,
      dueDate: item.dueDate,
      principalDue: item.principalDue,
      interestDue: item.interestDue,
      feesDue: item.feesDue,
      totalDue: item.totalDue,
    })),
  };

  return {
    version: 'r1d-v1',
    financedAmount,
    interestTotal: toMoneyString(interestTotal),
    items,
    scheduleHash: hashSchedule(canonical),
  };
}
