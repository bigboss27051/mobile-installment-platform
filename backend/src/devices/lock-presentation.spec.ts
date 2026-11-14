import { Prisma } from '@prisma/client';
import {
  daysOverdue,
  desiredPresentationFromOverdue,
  remainingBalance,
} from './lock-presentation';

describe('lock presentation', () => {
  it('never treats remaining as negative', () => {
    expect(
      remainingBalance(
        new Prisma.Decimal('100.00'),
        new Prisma.Decimal('150.00'),
      ).toFixed(2),
    ).toBe('0.00');
  });

  it('maps overdue days to iOS presentation without claiming OS lock', () => {
    const outstanding = new Prisma.Decimal('500.00');
    expect(
      desiredPresentationFromOverdue({ outstanding, maxOverdueDays: null }),
    ).toBe('NONE');
    expect(
      desiredPresentationFromOverdue({ outstanding, maxOverdueDays: 0 }),
    ).toBe('NONE');
    expect(
      desiredPresentationFromOverdue({ outstanding, maxOverdueDays: 2 }),
    ).toBe('REMINDER');
    expect(
      desiredPresentationFromOverdue({ outstanding, maxOverdueDays: 7 }),
    ).toBe('RESTRICT');
    expect(
      desiredPresentationFromOverdue({ outstanding, maxOverdueDays: 8 }),
    ).toBe('LOCK');
    expect(
      desiredPresentationFromOverdue({
        outstanding: new Prisma.Decimal('0'),
        maxOverdueDays: 30,
      }),
    ).toBe('NONE');
  });

  it('counts calendar days from due date', () => {
    expect(
      daysOverdue(
        new Date('2026-11-01T00:00:00.000Z'),
        new Date('2026-11-14T12:00:00.000Z'),
      ),
    ).toBe(13);
  });
});
