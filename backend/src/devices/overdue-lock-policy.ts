import { ScheduleItemStatus } from '@prisma/client';

const BANGKOK = 'Asia/Bangkok';

export function bangkokTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function overdueLockMarker(now: Date = new Date()): string {
  return `overdue-lock:${bangkokTodayYmd(now)}`;
}

export type ScheduleDueRow = {
  /** Prisma `@db.Date` as UTC midnight for the intended calendar day. */
  dueDate: Date;
  status: ScheduleItemStatus;
};

/** Unpaid (not PAID) with dueDate calendar day strictly before Bangkok today. */
export function isScheduleOverdue(
  items: ScheduleDueRow[],
  now: Date = new Date(),
): boolean {
  const today = bangkokTodayYmd(now);
  return items.some((item) => {
    if (item.status === ScheduleItemStatus.PAID) return false;
    // Compare @db.Date UTC calendar day to Bangkok "today" YMD (plan/lab contract).
    const dueStr = item.dueDate.toISOString().slice(0, 10);
    return dueStr < today;
  });
}