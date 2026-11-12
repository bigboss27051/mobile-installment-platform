import { Prisma } from '@prisma/client';

export function d(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Round half-up to 2 decimal places (THB satang). */
export function roundHalfUp2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
