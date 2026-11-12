import { Prisma } from '@prisma/client';

export function d(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Round half-up to 2 decimal places (THB satang). */
export function roundHalfUp2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Parse a THB money string (integer or at most 2 decimal places, 2dp-safe). */
export function parseThbMoneyString(
  value: string,
  field = 'amount',
): Prisma.Decimal {
  const dec = d(value);
  if (dec.decimalPlaces() > 2) {
    throw new Error(`${field} must not have more than 2 decimal places`);
  }
  const rounded = roundHalfUp2(dec);
  if (!rounded.eq(dec)) {
    throw new Error(`${field} must be an exact THB amount (2 decimal places)`);
  }
  return dec;
}
