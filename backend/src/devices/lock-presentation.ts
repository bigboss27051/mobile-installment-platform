import { Prisma } from '@prisma/client';

export type DesiredPresentation = 'NONE' | 'REMINDER' | 'RESTRICT' | 'LOCK';

/** Interim thresholds until the shared Device Lock Policy Engine exists. */
export const REMINDER_MAX_OVERDUE_DAYS = 3;
export const RESTRICT_MAX_OVERDUE_DAYS = 7;

export function remainingBalance(
  totalDue: Prisma.Decimal,
  amountPaid: Prisma.Decimal,
): Prisma.Decimal {
  const remaining = totalDue.minus(amountPaid);
  return remaining.gt(0) ? remaining : new Prisma.Decimal('0.00');
}

export function daysOverdue(dueDate: Date, now: Date): number {
  const due = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - due) / 86_400_000);
}

export function desiredPresentationFromOverdue(input: {
  outstanding: Prisma.Decimal;
  maxOverdueDays: number | null;
}): DesiredPresentation {
  if (input.outstanding.lte(0) || input.maxOverdueDays === null) {
    return 'NONE';
  }
  if (input.maxOverdueDays <= 0) {
    return 'NONE';
  }
  if (input.maxOverdueDays <= REMINDER_MAX_OVERDUE_DAYS) {
    return 'REMINDER';
  }
  if (input.maxOverdueDays <= RESTRICT_MAX_OVERDUE_DAYS) {
    return 'RESTRICT';
  }
  return 'LOCK';
}
