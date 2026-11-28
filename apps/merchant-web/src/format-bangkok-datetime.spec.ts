import { describe, expect, it } from 'vitest';
import { formatBangkokDateTime } from './format-bangkok-datetime';

describe('formatBangkokDateTime', () => {
  it('formats UTC instant in Asia/Bangkok as dd-mmm-yyyy HH:mm:ss', () => {
    expect(formatBangkokDateTime('2026-11-21T12:00:00.000Z')).toBe(
      '21-Nov-2026 19:00:00',
    );
  });

  it('returns null for empty input', () => {
    expect(formatBangkokDateTime(null)).toBeNull();
    expect(formatBangkokDateTime(undefined)).toBeNull();
    expect(formatBangkokDateTime('')).toBeNull();
  });

  it('returns raw string when unparseable', () => {
    expect(formatBangkokDateTime('not-a-date')).toBe('not-a-date');
  });
});