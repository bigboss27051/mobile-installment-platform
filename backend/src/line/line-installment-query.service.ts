import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScheduleItemStatus } from '@prisma/client';
import { remainingBalance } from '../devices/lock-presentation';
import { PrismaService } from '../prisma/prisma.service';

export type LineContractSummary = {
  contractId: string;
  status: string;
  outstandingBalance: string;
  nextDueDate: string | null;
  nextDueAmount: string | null;
  paidCount: number;
  remainingCount: number;
  history: Array<{
    seq: number;
    dueDate: string;
    totalDue: string;
    amountPaid: string;
    status: ScheduleItemStatus;
  }>;
};

@Injectable()
export class LineInstallmentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async summarizeForCustomer(
    tenantId: string,
    customerId: string,
    contractId?: string,
  ): Promise<{ contracts: LineContractSummary[]; selected: LineContractSummary | null }> {
    const where: Prisma.ContractWhereInput = { tenantId, customerId };
    if (contractId) {
      where.id = contractId;
    }
    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    if (contractId && contracts.length === 0) {
      throw new NotFoundException('Contract not found for customer.');
    }

    const summaries: LineContractSummary[] = [];
    for (const contract of contracts) {
      summaries.push(await this.summarizeContract(tenantId, contract.id, contract.status));
    }

    const selected =
      summaries.length === 1
        ? summaries[0]
        : contractId
          ? summaries[0] ?? null
          : null;

    return { contracts: summaries, selected };
  }

  formatBalanceReply(summaries: LineContractSummary[]): string {
    if (summaries.length === 0) {
      return 'ไม่พบสัญญาผ่อนชำระ';
    }
    if (summaries.length > 1) {
      const lines = summaries.map(
        (s, i) =>
          `${i + 1}) ${s.contractId.slice(0, 8)}… คงเหลือ ${s.outstandingBalance} บาท (${s.status})`,
      );
      return `คุณมีหลายสัญญา ส่ง SELECT <เลข> หรือ BALANCE <contractId>\n${lines.join('\n')}`;
    }
    const s = summaries[0];
    return `สัญญา ${s.contractId}\nสถานะ ${s.status}\nยอดคงเหลือ ${s.outstandingBalance} บาท\nงวดถัดไป ${s.nextDueDate ?? '-'} (${s.nextDueAmount ?? '-'} บาท)\nชำระแล้ว ${s.paidCount} / คงเหลือ ${s.remainingCount} งวด`;
  }

  formatNextReply(s: LineContractSummary): string {
    if (!s.nextDueDate) {
      return `สัญญา ${s.contractId}: ไม่มีงวดค้างชำระ`;
    }
    return `สัญญา ${s.contractId}\nงวดถัดไป ${s.nextDueDate}\nจำนวน ${s.nextDueAmount} บาท\nยอดคงเหลือรวม ${s.outstandingBalance} บาท`;
  }

  formatHistoryReply(s: LineContractSummary): string {
    if (s.history.length === 0) {
      return `สัญญา ${s.contractId}: ยังไม่มีประวัติงวด`;
    }
    const lines = s.history.map(
      (h) =>
        `#${h.seq} ${h.dueDate} ${h.status} due=${h.totalDue} paid=${h.amountPaid}`,
    );
    return `ประวัติงวด (ล่าสุด ${s.history.length})\n${lines.join('\n')}`;
  }

  private async summarizeContract(
    tenantId: string,
    contractId: string,
    status: string,
  ): Promise<LineContractSummary> {
    const items = await this.prisma.paymentScheduleItem.findMany({
      where: { tenantId, contractId },
      orderBy: { seq: 'asc' },
    });

    let outstanding = new Prisma.Decimal('0.00');
    let paidCount = 0;
    let remainingCount = 0;
    let nextDueDate: string | null = null;
    let nextDueAmount: string | null = null;

    for (const item of items) {
      const rem = remainingBalance(item.totalDue, item.amountPaid);
      outstanding = outstanding.plus(rem);
      if (item.status === ScheduleItemStatus.PAID) {
        paidCount += 1;
      } else {
        remainingCount += 1;
        if (!nextDueDate) {
          nextDueDate = item.dueDate.toISOString().slice(0, 10);
          nextDueAmount = rem.toFixed(2);
        }
      }
    }

    const history = items
      .filter((i) => i.status !== ScheduleItemStatus.PENDING)
      .slice(-5)
      .map((h) => ({
        seq: h.seq,
        dueDate: h.dueDate.toISOString().slice(0, 10),
        totalDue: h.totalDue.toFixed(2),
        amountPaid: h.amountPaid.toFixed(2),
        status: h.status,
      }));

    return {
      contractId,
      status,
      outstandingBalance: outstanding.toFixed(2),
      nextDueDate,
      nextDueAmount,
      paidCount,
      remainingCount,
      history,
    };
  }
}
