import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineSettingsPage } from './line-settings-page';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('LineSettingsPage', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.unstubAllGlobals();
  });

  it('shows webhook URL with tenant id for shop setup', async () => {
    fetchMock.mockImplementation((input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/v1/line/config')) {
        return jsonResponse(200, {
          data: {
            status: 'DISCONNECTED',
            channelId: null,
            maskedSecret: null,
            lastWebhookAt: null,
            lastError: null,
          },
        });
      }
      if (url.includes('/api/v1/tenants/me')) {
        return jsonResponse(200, {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Demo Shop',
            slug: 'demo-shop',
          },
        });
      }
      if (url.includes('/api/v1/contracts')) {
        return jsonResponse(200, { data: [] });
      }
      return jsonResponse(500, { error: { message: 'unexpected' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <I18nProvider>
          <LineSettingsPage onError={() => undefined} apiError={(m) => m} />
        </I18nProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const input = container.querySelector('#line-webhook-url') as HTMLInputElement | null;
    expect(input?.value).toContain(
      '/api/v1/webhooks/line/11111111-1111-4111-8111-111111111111',
    );
    expect(container.textContent).toContain('ขั้นตอนตั้งค่าสำหรับร้าน');
    expect(container.textContent).toContain('ส่งการแจ้งเตือนงวด (manual)');
  });
});
