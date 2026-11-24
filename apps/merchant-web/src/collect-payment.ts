export type CollectionMethod = 'CASH' | 'TRANSFER';
export type AmountIssue = 'empty' | 'invalid' | 'zero' | 'exceeds';

const MONEY = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const STORAGE_KEY = 'mip.staffCollection.idempotency';

type StoredKey = {
  contractId: string;
  scheduleItemId: string;
  amount: string;
  method: CollectionMethod;
  key: string;
  settled: boolean;
};

export function parseCents(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!MONEY.test(trimmed)) {
    return null;
  }
  const [baht, satang = ''] = trimmed.split('.');
  return BigInt(baht) * 100n + BigInt((satang + '00').slice(0, 2));
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  return `${negative ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

export function remainingDue(totalDue: string, amountPaid: string): string {
  const due = parseCents(totalDue);
  const paid = parseCents(amountPaid);
  if (due === null || paid === null) {
    return '0.00';
  }
  const left = due - paid;
  return formatCents(left > 0n ? left : 0n);
}

export function contractOutstanding(
  items: { totalDue: string; amountPaid: string; status: string }[],
): string {
  let sum = 0n;
  for (const item of items) {
    if (item.status === 'PAID') {
      continue;
    }
    const due = parseCents(item.totalDue);
    const paid = parseCents(item.amountPaid);
    if (due === null || paid === null) {
      continue;
    }
    const left = due - paid;
    if (left > 0n) {
      sum += left;
    }
  }
  return formatCents(sum);
}

export function collectionAmountIssue(amount: string, outstanding: string): AmountIssue | null {
  if (!amount.trim()) {
    return 'empty';
  }
  const cents = parseCents(amount);
  if (cents === null) {
    return 'invalid';
  }
  if (cents <= 0n) {
    return 'zero';
  }
  const cap = parseCents(outstanding);
  if (cap === null || cents > cap) {
    return 'exceeds';
  }
  return null;
}

export function canConfirmCollection(input: {
  amount: string;
  outstanding: string;
  method: CollectionMethod | null;
  submitting: boolean;
}): boolean {
  return (
    !input.submitting &&
    input.method !== null &&
    collectionAmountIssue(input.amount, input.outstanding) === null
  );
}

function readStored(): StoredKey | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredKey>;
    if (!parsed.key || !parsed.contractId || !parsed.scheduleItemId || !parsed.method) {
      return null;
    }
    return parsed as StoredKey;
  } catch {
    return null;
  }
}

export function collectionIdempotencyKey(input: {
  contractId: string;
  scheduleItemId: string;
  amount: string;
  method: CollectionMethod;
}): string {
  const amount = input.amount.trim();
  const stored = readStored();
  if (
    stored &&
    !stored.settled &&
    stored.contractId === input.contractId &&
    stored.scheduleItemId === input.scheduleItemId &&
    stored.amount === amount &&
    stored.method === input.method
  ) {
    return stored.key;
  }
  const key = crypto.randomUUID();
  const next: StoredKey = {
    contractId: input.contractId,
    scheduleItemId: input.scheduleItemId,
    amount,
    method: input.method,
    key,
    settled: false,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return key;
}

export function markCollectionSettled(key: string): void {
  const stored = readStored();
  if (!stored || stored.key !== key) {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, settled: true }));
}
