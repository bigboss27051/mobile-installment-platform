import { describe, expect, it } from 'vitest';
import {
  canStaffActivate,
  canStaffCancel,
  isTerminalEnrollment,
  resolveEnrollmentStatus,
} from './enroll-status';

describe('enrollment wizard status', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 1_000).toISOString();

  it('keeps waiting when the session has not expired', () => {
    expect(
      resolveEnrollmentStatus({ status: 'WAITING_FOR_DEVICE', expiresAt: future }),
    ).toBe('WAITING_FOR_DEVICE');
  });

  it('treats an open session as EXPIRED after TTL', () => {
    expect(
      resolveEnrollmentStatus({ status: 'WAITING_FOR_DEVICE', expiresAt: past }),
    ).toBe('EXPIRED');
  });

  it('does not rewrite terminal statuses even if expiresAt is past', () => {
    expect(
      resolveEnrollmentStatus({ status: 'CANCELLED', expiresAt: past }),
    ).toBe('CANCELLED');
    expect(
      resolveEnrollmentStatus({ status: 'COMPLETED', expiresAt: past }),
    ).toBe('COMPLETED');
  });

  it('allows cancel and activate only on open non-expired states', () => {
    expect(canStaffCancel('WAITING_FOR_DEVICE')).toBe(true);
    expect(canStaffActivate('ACTIVATING')).toBe(true);
    expect(canStaffCancel('EXPIRED')).toBe(false);
    expect(canStaffActivate('CANCELLED')).toBe(false);
    expect(isTerminalEnrollment('FAILED')).toBe(true);
    expect(isTerminalEnrollment('WAITING_FOR_DEVICE')).toBe(false);
  });
});
