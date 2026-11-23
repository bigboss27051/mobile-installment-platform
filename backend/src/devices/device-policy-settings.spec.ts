import {
  DEFAULT_DEVICE_POLICY_SETTINGS,
  validateDevicePolicySettingsInput,
} from './device-policy-settings';

describe('device-policy-settings', () => {
  it('accepts defaults', () => {
    expect(
      validateDevicePolicySettingsInput(DEFAULT_DEVICE_POLICY_SETTINGS),
    ).toEqual({ ok: true, value: DEFAULT_DEVICE_POLICY_SETTINGS });
  });

  it('rejects non-increasing days', () => {
    const r = validateDevicePolicySettingsInput({
      reminderAfterDays: 3,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects out of bounds', () => {
    const r = validateDevicePolicySettingsInput({
      reminderAfterDays: 0,
      restrictAfterDays: 3,
      lockAfterDays: 7,
      autoEvaluateCronEnabled: true,
      requireLockApproval: true,
    });
    expect(r.ok).toBe(false);
  });
});
