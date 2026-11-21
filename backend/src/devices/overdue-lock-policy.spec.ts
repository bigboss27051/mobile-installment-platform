import { DesiredPresentation, ScheduleItemStatus } from '@prisma/client';
import {
  bangkokTodayYmd,
  desiredRank,
  isScheduleOverdue,
  overdueDaysFromSchedule,
  overdueLadderMarker,
  overdueLockMarker,
  targetFromOverdueDays,
} from './overdue-lock-policy';

describe('overdue-lock-policy', () => {
  it('marks unpaid item with dueDate before Bangkok today as overdue', () => {
    const now = new Date('2026-11-21T10:00:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-20'), status: ScheduleItemStatus.PENDING }],
        now,
      ),
    ).toBe(true);
  });

  it('does not mark unpaid item due today (Bangkok) as overdue', () => {
    const now = new Date('2026-11-21T23:30:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-21'), status: ScheduleItemStatus.PENDING }],
        now,
      ),
    ).toBe(false);
  });

  it('ignores PAID items even if dueDate is past', () => {
    const now = new Date('2026-11-21T10:00:00+07:00');
    expect(
      isScheduleOverdue(
        [{ dueDate: new Date('2026-11-01'), status: ScheduleItemStatus.PAID }],
        now,
      ),
    ).toBe(false);
  });

  it('builds day marker from Bangkok calendar date', () => {
    expect(overdueLockMarker(new Date('2026-11-21T01:00:00+07:00'))).toBe(
      'overdue-lock:2026-11-21',
    );
    expect(bangkokTodayYmd(new Date('2026-11-20T23:30:00+07:00'))).toBe(
      '2026-11-20',
    );
  });

  it('computes overdue days from oldest unpaid past-due', () => {
    const now = new Date('2026-11-21T10:00:00+07:00');
    expect(
      overdueDaysFromSchedule(
        [
          { dueDate: new Date('2026-11-14'), status: ScheduleItemStatus.PENDING },
          { dueDate: new Date('2026-11-18'), status: ScheduleItemStatus.PENDING },
        ],
        now,
      ),
    ).toBe(7);
  });

  it('maps overdue days to ladder targets', () => {
    expect(targetFromOverdueDays(0)).toBeNull();
    expect(targetFromOverdueDays(1)).toBe(DesiredPresentation.REMINDER);
    expect(targetFromOverdueDays(2)).toBe(DesiredPresentation.REMINDER);
    expect(targetFromOverdueDays(3)).toBe(DesiredPresentation.RESTRICT);
    expect(targetFromOverdueDays(6)).toBe(DesiredPresentation.RESTRICT);
    expect(targetFromOverdueDays(7)).toBe(DesiredPresentation.LOCK);
  });

  it('ranks desired presentations for escalate-only', () => {
    expect(desiredRank(DesiredPresentation.NONE)).toBeLessThan(
      desiredRank(DesiredPresentation.REMINDER),
    );
    expect(desiredRank(DesiredPresentation.RESTRICT)).toBeLessThan(
      desiredRank(DesiredPresentation.LOCK),
    );
  });

  it('builds ladder markers', () => {
    expect(
      overdueLadderMarker(
        DesiredPresentation.RESTRICT,
        new Date('2026-11-21T10:00:00+07:00'),
      ),
    ).toBe('overdue-ladder:2026-11-21:RESTRICT');
  });
});
