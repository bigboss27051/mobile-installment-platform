import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  EnqueueMdmCommandInput,
  MdmCommandReceipt,
  MdmProviderPort,
} from '../ports/mdm-provider.port';

/**
 * No Apple HTTP, APNs, or vendor API. Commands remain QUEUED so callers
 * cannot treat enqueue as lock/unlock success (IOS-A).
 */
@Injectable()
export class SandboxMdmAdapter implements MdmProviderPort {
  async enqueueCommand(
    input: EnqueueMdmCommandInput,
  ): Promise<MdmCommandReceipt> {
    const commandId = randomUUID();
    const fingerprint = createHash('sha256')
      .update(
        `${input.tenantId}:${input.deviceId}:${input.type}:${input.idempotencyKey}`,
      )
      .digest('hex')
      .slice(0, 12);

    return {
      commandId,
      tenantId: input.tenantId,
      deviceId: input.deviceId,
      type: input.type,
      status: 'QUEUED',
      provider: `sandbox:${fingerprint}`,
      osEnforcement: 'NONE',
      failureReason: 'BLOCKED_UNTIL_VENDOR_MDM',
    };
  }
}
