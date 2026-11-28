const BANGKOK_TZ = 'Asia/Bangkok';

/** Staff-facing timestamps in Asia/Bangkok: `dd-mmm-yyyy HH:mm:ss` (e.g. `21-Nov-2026 19:00:00`). */
export function formatBangkokDateTime(
  value: string | Date | null | undefined,
): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return typeof value === 'string' ? value : null;
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: BANGKOK_TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}