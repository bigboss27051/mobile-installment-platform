export type ShopSetupInput = {
  dpcAttested: boolean;
  googleAccountReady: boolean;
  wipeNeedsOnDeviceUnlock: boolean;
  noRemoteFrpBypass: boolean;
};

export type ShopSetupPublic = ShopSetupInput & {
  ready: boolean;
  completedAt: Date | null;
};

const FIELDS = [
  'dpcAttested',
  'googleAccountReady',
  'wipeNeedsOnDeviceUnlock',
  'noRemoteFrpBypass',
] as const;

export function parseShopSetupInput(
  input: Partial<Record<(typeof FIELDS)[number], unknown>>,
): { ok: true; value: ShopSetupInput } | { ok: false } {
  const value = {} as ShopSetupInput;
  for (const field of FIELDS) {
    if (typeof input[field] !== 'boolean') {
      return { ok: false };
    }
    value[field] = input[field];
  }
  return { ok: true, value };
}

export function isShopSetupReady(input: ShopSetupInput): boolean {
  return (
    input.dpcAttested &&
    input.googleAccountReady &&
    input.wipeNeedsOnDeviceUnlock &&
    input.noRemoteFrpBypass
  );
}
