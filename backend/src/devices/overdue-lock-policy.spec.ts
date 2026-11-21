import { ScheduleItemStatus } from '@prisma/client';
import {
  bangkokTodayYmd,
  isScheduleOverdue,
  overdueLockMarker,
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
});