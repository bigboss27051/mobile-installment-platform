export const MDM_PROVIDER = Symbol('MDM_PROVIDER');

export type MdmCommandType =
  | 'ENABLE_SINGLE_APP_MODE'
  | 'DISABLE_SINGLE_APP_MODE'
  | 'DEVICE_LOCK'
  | 'DEVICE_INFORMATION_QUERY'
  | 'RESTRICTION_PROFILE_UPDATE'
  | 'PROFILE_REMOVAL';

export type MdmCommandStatus = 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';

export type OsEnforcement = 'NONE' | 'PENDING' | 'SINGLE_APP_MODE' | 'DEVICE_LOCK';

export type EnqueueMdmCommandInput = {
  tenantId: string;
  deviceId: string;
  type: MdmCommandType;
  reason: string;
  actorUserId: string;
  idempotencyKey: string;
};

export type MdmCommandReceipt = {
  commandId: string;
  tenantId: string;
  deviceId: string;
  type: MdmCommandType;
  status: MdmCommandStatus;
  provider: string;
  osEnforcement: OsEnforcement;
  failureReason: string | null;
};

/**
 * Vendor MDM anti-corruption layer. Apple / vendor payloads stay in adapters.
 * HTTP 201 / enqueue must not imply the device is locked.
 */
export interface MdmProviderPort {
  enqueueCommand(input: EnqueueMdmCommandInput): Promise<MdmCommandReceipt>;
}
