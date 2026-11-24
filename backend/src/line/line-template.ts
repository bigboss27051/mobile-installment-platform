export type LineTemplateVars = Record<string, string>;

export function renderLineTemplate(body: string, vars: LineTemplateVars): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export const DEFAULT_LINE_TEMPLATES: Record<string, string> = {
  PAYMENT_CONFIRMATION:
    'สวัสดี {{customerName}} ได้รับการชำระ {{amount}} บาท สำหรับเลขที่สัญญา {{contractId}} แล้ว ยอดคงเหลือ {{outstandingBalance}} บาท — {{merchantName}}',
  PAYMENT_REMINDER:
    'สวัสดี {{customerName}} งวดถัดไปครบกำหนด {{dueDate}} จำนวน {{amount}} บาท เลขที่สัญญา {{contractId}} ยอดคงเหลือ {{outstandingBalance}} บาท — {{merchantName}}',
  CONTRACT_INFO:
    'เลขที่สัญญา {{contractId}} สถานะ {{contractStatus}} ยอดคงเหลือ {{outstandingBalance}} บาท — {{merchantName}}',
};
