const CONTRACT_NUMBER_PATTERN = /^C(\d+)$/;

export function nextContractNumber(current: string | null | undefined): string {
  const match = current?.match(CONTRACT_NUMBER_PATTERN);
  const parsed = match ? Number(match[1]) : 0;
  const next = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed + 1 : 1;
  return `C${String(next).padStart(6, '0')}`;
}
