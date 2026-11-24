const OPEN_STATUSES = new Set([
  'NOT_STARTED',
  'WAITING_FOR_DEVICE',
  'QR_GENERATED',
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

/** Staff-facing code: first 8 hex digits of the session id, grouped as 1674-EFEA. */
export function readableSessionCode(id: string): string {
  const compact = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  if (compact.length <= 4) {
    return compact;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

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

export function showsAndroidQr(status: string): boolean {
  return status === 'WAITING_FOR_DEVICE' || status === 'QR_GENERATED';
}

export function canIssueEnrollmentQr(
  platform: string,
  status: string,
  hasQrPayload: boolean,
): boolean {
  return platform === 'ANDROID' && showsAndroidQr(status) && !hasQrPayload;
}

export type AndroidFrpChecklist = {
  frpClearedOrNotApplicable: boolean;
  newQrAfterWipe: boolean;
  noRemoteFrpBypass: boolean;
};

/** Staff attestation before create session / issue QR (D-060). */
export function isAndroidFrpChecklistComplete(
  checklist: AndroidFrpChecklist,
): boolean {
  return (
    checklist.frpClearedOrNotApplicable &&
    checklist.newQrAfterWipe &&
    checklist.noRemoteFrpBypass
  );
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
