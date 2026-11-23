export type DevicePolicySettingsInput = {
  reminderAfterDays: number;
  restrictAfterDays: number;
  lockAfterDays: number;
  autoEvaluateCronEnabled: boolean;
  requireLockApproval: boolean;
};

export const DEFAULT_DEVICE_POLICY_SETTINGS: DevicePolicySettingsInput = {
  reminderAfterDays: 1,
  restrictAfterDays: 3,
  lockAfterDays: 7,
  autoEvaluateCronEnabled: true,
  requireLockApproval: true,
};

export function validateDevicePolicySettingsInput(
  input: DevicePolicySettingsInput,
):
  | { ok: true; value: DevicePolicySettingsInput }
  | { ok: false; code: string } {
  const {
    reminderAfterDays: r,
    restrictAfterDays: s,
    lockAfterDays: l,
  } = input;
  if (![r, s, l].every((n) => Number.isInteger(n))) {
    return { ok: false, code: 'DAYS_MUST_BE_INT' };
  }
  if (r < 1 || l > 365 || !(r < s && s < l)) {
    return { ok: false, code: 'INVALID_DAY_ORDER' };
  }
  return {
    ok: true,
    value: {
      reminderAfterDays: r,
      restrictAfterDays: s,
      lockAfterDays: l,
      autoEvaluateCronEnabled: Boolean(input.autoEvaluateCronEnabled),
      requireLockApproval: Boolean(input.requireLockApproval),
    },
  };
}
