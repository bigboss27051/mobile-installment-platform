import { Prisma } from '@prisma/client';

import { d, roundHalfUp2 } from '../schedule/money';

export type ScheduleOutstanding = {
  id: string;
  seq: number;
  totalDue: string;
  amountPaid: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
};

export type AllocationApply = {
  scheduleItemId: string;
  seq: number;
  amount: string;
  nextAmountPaid: string;
  nextStatus: 'PARTIAL' | 'PAID';
};

function toMoneyString(value: Prisma.Decimal): string {
  return roundHalfUp2(value).toFixed(2);
}

function outstandingFor(item: ScheduleOutstanding): Prisma.Decimal {
  return d(item.totalDue).minus(d(item.amountPaid));
}

function isEligible(item: ScheduleOutstanding): boolean {
  if (item.status === 'PAID') {
    return false;
  }
  return outstandingFor(item).gt(0);
}

export function allocateFifo(
  items: ScheduleOutstanding[],
  paymentAmount: string,
): AllocationApply[] {
  const remaining = d(paymentAmount);
  if (remaining.lte(0)) {
    throw new Error('payment amount must be positive');
  }

  const ordered = [...items].filter(isEligible).sort((a, b) => a.seq - b.seq);
  const applies: AllocationApply[] = [];
  let left = remaining;

  for (const item of ordered) {
    if (left.lte(0)) {
      break;
    }

    const outstanding = outstandingFor(item);
    if (outstanding.lte(0)) {
      continue;
    }

    const amount = Prisma.Decimal.min(left, outstanding);
    const nextPaid = d(item.amountPaid).plus(amount);
    const nextStatus: AllocationApply['nextStatus'] = nextPaid.gte(d(item.totalDue))
      ? 'PAID'
      : 'PARTIAL';

    applies.push({
      scheduleItemId: item.id,
      seq: item.seq,
      amount: toMoneyString(amount),
      nextAmountPaid: toMoneyString(nextPaid),
      nextStatus,
    });

    left = left.minus(amount);
  }

  if (left.gt(0)) {
    throw new Error('payment exceeds total outstanding');
  }

  return applies;
}
