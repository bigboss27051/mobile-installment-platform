const OPEN_STATUSES = new Set([
  'WAITING_FOR_DEVICE',
  'PROVISIONING',
  'ENROLLING',
  'VERIFYING',
  'ACTIVATING',
]);

const TERMINAL_STATUSES = new Set([
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'RECOVERY_REQUIRED',
]);

export function resolveEnrollmentStatus(
  session: { status: string; expiresAt: string | Date },
  now = Date.now(),
): string {
  if (OPEN_STATUSES.has(session.status) && new Date(session.expiresAt).getTime() <= now) {
    return 'EXPIRED';
  }
  return session.status;
}

export function isTerminalEnrollment(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canStaffCancel(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

export function canStaffActivate(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

export function statusTone(status: string): 'ok' | 'warn' | 'bad' | 'idle' {
  if (status === 'COMPLETED') {
    return 'ok';
  }
  if (status === 'ACTIVATING' || status === 'VERIFYING' || status === 'ENROLLING') {
    return 'warn';
  }
  if (isTerminalEnrollment(status)) {
    return 'bad';
  }
  return 'idle';
}
