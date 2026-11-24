import { describe, expect, it } from 'vitest';
import {
  canIssueEnrollmentQr,
  canStaffActivate,
  canStaffCancel,
  isAndroidFrpChecklistComplete,
  isTerminalEnrollment,
  readableSessionCode,
  resolveEnrollmentStatus,
  showsAndroidQr,
} from './enroll-status';

describe('enrollment wizard status', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 1_000).toISOString();

  it('shows a short grouped session code', () => {
    expect(readableSessionCode('1674efea-1d9e-4ed5-8074-ad4d371e6ba2')).toBe('1674-EFEA');
  });

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
    expect(canStaffCancel('QR_GENERATED')).toBe(true);
    expect(canStaffCancel('NOT_STARTED')).toBe(true);
    expect(showsAndroidQr('QR_GENERATED')).toBe(true);
    expect(showsAndroidQr('ENROLLING')).toBe(false);
  });

  it('offers another QR only while Android is waiting and the page has no payload', () => {
    expect(canIssueEnrollmentQr('ANDROID', 'WAITING_FOR_DEVICE', false)).toBe(true);
    expect(canIssueEnrollmentQr('ANDROID', 'QR_GENERATED', false)).toBe(true);
    expect(canIssueEnrollmentQr('ANDROID', 'QR_GENERATED', true)).toBe(false);
    expect(canIssueEnrollmentQr('ANDROID', 'PROVISIONING', false)).toBe(false);
    expect(canIssueEnrollmentQr('IOS', 'WAITING_FOR_DEVICE', false)).toBe(false);
  });

  it('expires a generated QR after TTL', () => {
    expect(
      resolveEnrollmentStatus({ status: 'QR_GENERATED', expiresAt: past }),
    ).toBe('EXPIRED');
  });

  it('requires every Android FRP checklist item before issuing QR', () => {
    expect(
      isAndroidFrpChecklistComplete({
        frpClearedOrNotApplicable: false,
        newQrAfterWipe: false,
        noRemoteFrpBypass: false,
      }),
    ).toBe(false);
    expect(
      isAndroidFrpChecklistComplete({
        frpClearedOrNotApplicable: true,
        newQrAfterWipe: true,
        noRemoteFrpBypass: false,
      }),
    ).toBe(false);
    expect(
      isAndroidFrpChecklistComplete({
        frpClearedOrNotApplicable: true,
        newQrAfterWipe: true,
        noRemoteFrpBypass: true,
      }),
    ).toBe(true);
  });
});
