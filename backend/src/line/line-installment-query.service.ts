import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScheduleItemStatus } from '@prisma/client';
import { remainingBalance } from '../devices/lock-presentation';
import { PrismaService } from '../prisma/prisma.service';

const CONTRACT_STATUS_TH: Record<string, string> = {
  DRAFT: 'ฉบับร่าง',
  ACTIVE: 'เปิดใช้งาน',
  CANCELLED: 'ยกเลิก',
  CLOSED: 'ปิดสัญญา',
};

const SCHEDULE_STATUS_TH: Record<string, string> = {
  PENDING: 'รอชำระ',
  PARTIAL: 'ชำระบางส่วน',
  PAID: 'ชำระครบ',
};

function thaiLabel(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code;
}

export type LineContractSummary = {
  contractId: string;
  contractNumber: string;
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
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          contractId,
        );
      where.OR = isUuid
        ? [{ id: contractId }, { contractNumber: contractId }]
        : [{ contractNumber: contractId }];
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
      summaries.push(
        await this.summarizeContract(
          tenantId,
          contract.id,
          contract.contractNumber,
          contract.status,
        ),
      );
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
          `${i + 1}) ${s.contractNumber} คงเหลือ ${s.outstandingBalance} บาท (${thaiLabel(CONTRACT_STATUS_TH, s.status)})`,
      );
      return `คุณมีหลายสัญญา ส่ง ยอด ตามด้วยเลขที่สัญญา เช่น ยอด C000001\n${lines.join('\n')}`;
    }
    const s = summaries[0];
    return `สัญญา ${s.contractNumber}\nสถานะ ${thaiLabel(CONTRACT_STATUS_TH, s.status)}\nยอดคงเหลือ ${s.outstandingBalance} บาท\nงวดถัดไป ${s.nextDueDate ?? '-'} (${s.nextDueAmount ?? '-'} บาท)\nชำระแล้ว ${s.paidCount} / คงเหลือ ${s.remainingCount} งวด`;
  }

  formatNextReply(s: LineContractSummary): string {
    if (!s.nextDueDate) {
      return `สัญญา ${s.contractNumber}: ไม่มีงวดค้างชำระ`;
    }
    return `สัญญา ${s.contractNumber}\nงวดถัดไป ${s.nextDueDate}\nจำนวน ${s.nextDueAmount} บาท\nยอดคงเหลือรวม ${s.outstandingBalance} บาท`;
  }

  formatHistoryReply(s: LineContractSummary): string {
    if (s.history.length === 0) {
      return `สัญญา ${s.contractNumber}: ยังไม่มีประวัติงวด`;
    }
    const lines = s.history.map(
      (h) =>
        `งวด ${h.seq} ${h.dueDate} ${thaiLabel(SCHEDULE_STATUS_TH, h.status)} ครบกำหนด ${h.totalDue} ชำระแล้ว ${h.amountPaid}`,
    );
    return `สัญญา ${s.contractNumber}\nประวัติงวด (ล่าสุด ${s.history.length})\n${lines.join('\n')}`;
  }

  private async summarizeContract(
    tenantId: string,
    contractId: string,
    contractNumber: string,
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
      contractNumber,
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
