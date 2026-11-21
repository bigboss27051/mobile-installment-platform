import { DesiredPresentation, Prisma } from '@prisma/client';

/**
 * Phase 4a: verified payment only auto-steps desired to NONE when outstanding is zero.
 * Does not escalate restriction from ledger (staff/policy jobs later).
 */
export function desiredFromOutstanding(
  outstanding: Prisma.Decimal | string | number,
): DesiredPresentation {
  const value = new Prisma.Decimal(outstanding);
  if (value.lte(0)) {
    return DesiredPresentation.NONE;
  }
  return DesiredPresentation.LOCK;
}

export function unlockCommandsForDesired(
  currentDesired: DesiredPresentation,
): Array<'STOP_LOCK_TASK' | 'STOP_PACKAGE_SUSPEND'> {
  switch (currentDesired) {
    case DesiredPresentation.LOCK:
      return ['STOP_LOCK_TASK'];
    case DesiredPresentation.RESTRICT:
      return ['STOP_PACKAGE_SUSPEND'];
    case DesiredPresentation.REMINDER:
    case DesiredPresentation.NONE:
    default:
      return [];
  }
}
