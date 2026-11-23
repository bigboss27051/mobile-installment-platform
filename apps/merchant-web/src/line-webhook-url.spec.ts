import { describe, expect, it } from 'vitest';
import { buildLineWebhookUrl, resolveApiOrigin } from './line-webhook-url';

describe('line webhook url helpers', () => {
  it('builds webhook path with tenant id', () => {
    expect(buildLineWebhookUrl('https://api.example.com', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(
      'https://api.example.com/api/v1/webhooks/line/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('prefers vite api origin over window origin', () => {
    expect(resolveApiOrigin('http://localhost:5173', 'https://192.168.1.10:3443')).toBe(
      'https://192.168.1.10:3443',
    );
    expect(resolveApiOrigin('http://localhost:5173', undefined)).toBe('http://localhost:5173');
  });
});
