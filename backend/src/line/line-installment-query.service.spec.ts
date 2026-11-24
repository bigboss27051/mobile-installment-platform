import { ScheduleItemStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { LineInstallmentQueryService } from './line-installment-query.service';

describe('LineInstallmentQueryService', () => {
  const prisma = {
    contract: { findMany: jest.fn() },
    paymentScheduleItem: { findMany: jest.fn() },
  };
  const service = new LineInstallmentQueryService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('formats balance for a single contract from schedule remainders', async () => {
    prisma.contract.findMany.mockResolvedValue([
      { id: 'c1', contractNumber: 'C000001', status: 'ACTIVE' },
    ]);
    prisma.paymentScheduleItem.findMany.mockResolvedValue([
      {
        seq: 1,
        dueDate: new Date('2026-01-01'),
        totalDue: new Prisma.Decimal('1000.00'),
        amountPaid: new Prisma.Decimal('1000.00'),
        status: ScheduleItemStatus.PAID,
      },
      {
        seq: 2,
        dueDate: new Date('2026-02-01'),
        totalDue: new Prisma.Decimal('1000.00'),
        amountPaid: new Prisma.Decimal('0.00'),
        status: ScheduleItemStatus.PENDING,
      },
    ]);

    const { selected } = await service.summarizeForCustomer('t1', 'cust1');
    expect(selected?.outstandingBalance).toBe('1000.00');
    expect(selected?.nextDueDate).toBe('2026-02-01');
    expect(selected?.paidCount).toBe(1);
    expect(selected?.remainingCount).toBe(1);
    const reply = service.formatBalanceReply([selected!]);
    expect(reply).toContain('C000001');
    expect(reply).toContain('เปิดใช้งาน');
    expect(reply).toContain('1000.00');
    expect(reply).not.toContain('c1');
  });
});
