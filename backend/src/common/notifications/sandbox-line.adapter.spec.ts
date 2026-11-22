import { SandboxLineAdapter, signLineWebhook } from './sandbox-line.adapter';

describe('SandboxLineAdapter', () => {
  const secret = 'channel-secret-test';
  const adapter = new SandboxLineAdapter();

  it('accepts valid x-line-signature', () => {
    const body = Buffer.from('{"events":[]}');
    const sig = signLineWebhook(body, secret);
    expect(
      adapter.verifyWebhookSignature({ 'x-line-signature': sig }, body, secret),
    ).toBe(true);
  });

  it('rejects invalid signature', () => {
    const body = Buffer.from('{"events":[]}');
    expect(
      adapter.verifyWebhookSignature({ 'x-line-signature': 'nope' }, body, secret),
    ).toBe(false);
  });

  it('rejects missing signature', () => {
    const body = Buffer.from('{"events":[]}');
    expect(adapter.verifyWebhookSignature({}, body, secret)).toBe(false);
  });

  it('sendTextMessage returns a provider message id', async () => {
    const result = await adapter.sendTextMessage({
      accessToken: 'token',
      toLineUserId: 'U123',
      text: 'hello',
    });
    expect(result.providerMessageId).toMatch(/^sandbox_line_/);
  });
});
