import { DesiredPresentation, ScheduleItemStatus } from '@prisma/client';

const BANGKOK = 'Asia/Bangkok';

/** Lab fixed ladder (D-065). */
export const LAB_REMINDER_DAYS = 1;
export const LAB_RESTRICT_DAYS = 3;
export const LAB_LOCK_DAYS = 7;

export function bangkokTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** @deprecated Prefer overdueLadderMarker — kept for older audits. */
export function overdueLockMarker(now: Date = new Date()): string {
  return `overdue-lock:${bangkokTodayYmd(now)}`;
}

export function overdueLadderMarker(
  target: DesiredPresentation,
  now: Date = new Date(),
): string {
  return `overdue-ladder:${bangkokTodayYmd(now)}:${target}`;
}

export type ScheduleDueRow = {
  /** Prisma `@db.Date` as UTC midnight for the intended calendar day. */
  dueDate: Date;
  status: ScheduleItemStatus;
};

function dueYmd(dueDate: Date): string {
  return dueDate.toISOString().slice(0, 10);
}

/** Unpaid (not PAID) with dueDate calendar day strictly before Bangkok today. */
export function isScheduleOverdue(
  items: ScheduleDueRow[],
  now: Date = new Date(),
): boolean {
  return overdueDaysFromSchedule(items, now) > 0;
}

/**
 * Days past oldest unpaid past-due installment (Bangkok calendar).
 * 0 if none overdue.
 */
export function overdueDaysFromSchedule(
  items: ScheduleDueRow[],
  now: Date = new Date(),
): number {
  const today = bangkokTodayYmd(now);
  let oldest: string | null = null;
  for (const item of items) {
    if (item.status === ScheduleItemStatus.PAID) continue;
    const dueStr = dueYmd(item.dueDate);
    if (dueStr >= today) continue;
    if (!oldest || dueStr < oldest) oldest = dueStr;
  }
  if (!oldest) return 0;
  const start = Date.parse(`${oldest}T00:00:00Z`);
  const end = Date.parse(`${today}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

export function targetFromOverdueDays(
  days: number,
): DesiredPresentation | null {
  if (days >= LAB_LOCK_DAYS) return DesiredPresentation.LOCK;
  if (days >= LAB_RESTRICT_DAYS) return DesiredPresentation.RESTRICT;
  if (days >= LAB_REMINDER_DAYS) return DesiredPresentation.REMINDER;
  return null;
}

const DESIRED_RANK: Record<DesiredPresentation, number> = {
  [DesiredPresentation.NONE]: 0,
  [DesiredPresentation.REMINDER]: 1,
  [DesiredPresentation.RESTRICT]: 2,
  [DesiredPresentation.LOCK]: 3,
};

export function desiredRank(desired: DesiredPresentation): number {
  return DESIRED_RANK[desired] ?? 0;
}
