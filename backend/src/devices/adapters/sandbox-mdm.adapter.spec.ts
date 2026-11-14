import { SandboxMdmAdapter } from './sandbox-mdm.adapter';

describe('SandboxMdmAdapter', () => {
  it('queues commands without reporting Single App Mode', async () => {
    const adapter = new SandboxMdmAdapter();
    const receipt = await adapter.enqueueCommand({
      tenantId: 'tenant-a',
      deviceId: 'device-1',
      type: 'ENABLE_SINGLE_APP_MODE',
      reason: 'overdue-test',
      actorUserId: 'user-1',
      idempotencyKey: 'key-1',
    });

    expect(receipt.status).toBe('QUEUED');
    expect(receipt.osEnforcement).toBe('NONE');
    expect(receipt.failureReason).toBe('BLOCKED_UNTIL_VENDOR_MDM');
  });
});
