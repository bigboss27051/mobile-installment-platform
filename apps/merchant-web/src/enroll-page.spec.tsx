import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnrollPage } from './enroll-page';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const future = new Date(Date.now() + 60_000).toISOString();

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function checkConsentAndFrp(container: HTMLElement) {
  const boxes = Array.from(
    container.querySelectorAll('input[type="checkbox"]'),
  ) as HTMLInputElement[];
  for (const box of boxes) {
    if (!box.checked) {
      await act(async () => {
        box.click();
      });
    }
  }
}

describe('EnrollPage QR issue button', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('issues a QR from the button after the first attempt fails, and refresh does not call QR', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const qrCalls: string[] = [];
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (String(path).includes('/enrollment-sessions/open')) {
        return jsonResponse(200, { data: null });
      }
      if (
        (init?.method ?? 'GET') === 'GET' &&
        String(path).includes('/api/v1/devices/enrollment/dpc-config-status')
      ) {
        return jsonResponse(200, { data: { configured: true, missing: [] } });
      }
      if ((init?.method ?? 'GET') === 'GET' && String(path).includes('/api/v1/contracts')) {
        return jsonResponse(200, {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'ACTIVE',
              principal: '8000.00',
              termMonths: 6,
            },
          ],
        });
      }
      if (String(path).endsWith('/qr')) {
        qrCalls.push(init?.method ?? 'GET');
        if (qrCalls.length === 1) {
          return jsonResponse(503, { error: { message: 'DPC_QR_NOT_CONFIGURED' } });
        }
        return jsonResponse(201, {
          data: {
            format: 'ANDROID_ENTERPRISE_QR',
            payload: { enrollment: 'project-dpc' },
            payloadFingerprint: 'ab'.repeat(32),
            expiresAt: future,
          },
        });
      }
      if (init?.method === 'POST') {
        return jsonResponse(201, {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            status: 'WAITING_FOR_DEVICE',
            platform: 'ANDROID',
            expiresAt: future,
            contractId: '22222222-2222-4222-8222-222222222222',
          },
        });
      }
      return jsonResponse(200, {
        data: {
          id: '11111111-1111-4111-8111-111111111111',
          status: 'WAITING_FOR_DEVICE',
          platform: 'ANDROID',
          expiresAt: future,
          contractId: '22222222-2222-4222-8222-222222222222',
        },
      });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const errors: Array<string | null> = [];
    await act(async () => {
      root.render(
        <I18nProvider>
          <EnrollPage
            onError={(message) => {
              errors.push(message);
            }}
            apiError={(message) => message}
          />
        </I18nProvider>,
      );
    });

    expect((container.querySelector('#enroll-contract-id') as HTMLSelectElement).value).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    await checkConsentAndFrp(container);
    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const issue = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'ออก QR',
    );
    expect(issue).toBeTruthy();
    expect(errors.at(-1)).toBe('DPC_QR_NOT_CONFIGURED');

    await act(async () => {
      issue?.click();
    });

    expect(container.textContent).toContain('project-dpc');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const qrImage = container.querySelector('[data-testid="enroll-qr"]');
    expect(qrImage).toBeTruthy();
    expect(qrImage?.getAttribute('src') ?? '').toMatch(/^data:image\/png;base64,/);
    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'ออก QR',
      ),
    ).toBe(false);

    const refresh = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'รีเฟรชสถานะ',
    );
    await act(async () => {
      refresh?.click();
    });
    expect(qrCalls).toEqual(['POST', 'POST']);
  });

  it('disables Android create when DPC config is incomplete', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (String(path).includes('/enrollment-sessions/open')) {
        return jsonResponse(200, { data: null });
      }
      if (String(path).includes('/dpc-config-status')) {
        return jsonResponse(200, {
          data: {
            configured: false,
            missing: ['DPC_DOWNLOAD_URL', 'DPC_PACKAGE_CHECKSUM'],
          },
        });
      }
      if ((init?.method ?? 'GET') === 'GET' && String(path).includes('/api/v1/contracts')) {
        return jsonResponse(200, {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'ACTIVE',
              principal: '8000.00',
              termMonths: 6,
            },
          ],
        });
      }
      return jsonResponse(200, { data: [] });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <EnrollPage onError={() => undefined} apiError={(message) => message} />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="enroll-dpc-missing"]')).toBeTruthy();
    expect(container.textContent).toContain('DPC_DOWNLOAD_URL');
    const submit = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('สร้างเซสชัน'),
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('blocks create session until Android FRP checklist is complete', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (String(path).includes('/enrollment-sessions/open')) {
        return jsonResponse(200, { data: null });
      }
      if (String(path).includes('/dpc-config-status')) {
        return jsonResponse(200, { data: { configured: true, missing: [] } });
      }
      if ((init?.method ?? 'GET') === 'GET' && String(path).includes('/api/v1/contracts')) {
        return jsonResponse(200, {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'ACTIVE',
              principal: '8000.00',
              termMonths: 6,
            },
          ],
        });
      }
      if (init?.method === 'POST') {
        return jsonResponse(201, {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            status: 'WAITING_FOR_DEVICE',
            platform: 'ANDROID',
            expiresAt: future,
            contractId: '22222222-2222-4222-8222-222222222222',
          },
        });
      }
      return jsonResponse(200, { data: [] });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const errors: Array<string | null> = [];
    await act(async () => {
      root.render(
        <I18nProvider>
          <EnrollPage
            onError={(message) => {
              errors.push(message);
            }}
            apiError={(message) => message}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('FRP');
    expect(container.textContent).toMatch(/ไม่สามารถปลด FRP|cannot clear FRP/i);

    const consent = container.querySelector(
      '[data-testid="enroll-consent"]',
    ) as HTMLInputElement;
    await act(async () => {
      consent.click();
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(errors.at(-1)).toMatch(/FRP/);
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes('/api/v1/devices/enrollment-sessions') &&
          !String(call[0]).includes('/open'),
      ),
    ).toBe(false);

    await checkConsentAndFrp(container);
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          (call[1] as RequestInit | undefined)?.method === 'POST' &&
          String(call[0]).includes('/api/v1/devices/enrollment-sessions'),
      ),
    ).toBe(true);
  });

  it('shows refresh and activate when an open session is resumed', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string) => {
      if (String(path).includes('/enrollment-sessions/open')) {
        return jsonResponse(200, {
          data: {
            id: '1674efea-1d9e-4ed5-8074-ad4d371e6ba2',
            status: 'ENROLLING',
            platform: 'ANDROID',
            expiresAt: future,
            contractId: '22222222-2222-4222-8222-222222222222',
            lastErrorCode: null,
          },
        });
      }
      if (String(path).includes('/dpc-config-status')) {
        return jsonResponse(200, { data: { configured: true, missing: [] } });
      }
      if (String(path).includes('/api/v1/contracts')) {
        return jsonResponse(200, {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'ACTIVE',
              principal: '8000.00',
              termMonths: 6,
            },
          ],
        });
      }
      return jsonResponse(200, { data: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <EnrollPage onError={() => undefined} apiError={(message) => message} />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('รีเฟรชสถานะ');
    expect(container.textContent).toContain('เปิดใช้งานและผูกสัญญา');
    expect(container.textContent).toContain('รหัสเซสชัน 1674-EFEA');
    expect(container.textContent).not.toContain('1674efea-1d9e-4ed5-8074-ad4d371e6ba2');
  });

  it('shows the shop-setup prompt and does not render a QR when create returns SHOP_SETUP_REQUIRED', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const opened: string[] = [];
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (String(path).includes('/enrollment-sessions/open')) {
        return jsonResponse(200, { data: null });
      }
      if (String(path).includes('/dpc-config-status')) {
        return jsonResponse(200, { data: { configured: true, missing: [] } });
      }
      if ((init?.method ?? 'GET') === 'GET' && String(path).includes('/api/v1/contracts')) {
        return jsonResponse(200, {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'ACTIVE',
              principal: '8000.00',
              termMonths: 6,
            },
          ],
        });
      }
      if (init?.method === 'POST' && String(path).includes('/enrollment-sessions')) {
        return jsonResponse(409, { error: { message: 'SHOP_SETUP_REQUIRED' } });
      }
      return jsonResponse(200, { data: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <EnrollPage
            onError={() => undefined}
            apiError={(message) => message}
            onOpenShopSetup={() => opened.push('shop')}
          />
        </I18nProvider>,
      );
    });
    await checkConsentAndFrp(container);
    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ต้องบันทึกตั้งค่าร้าน');
    expect(container.querySelector('[data-testid="enroll-qr"]')).toBeNull();
    const open = container.querySelector(
      '[data-testid="enroll-open-shop-setup"]',
    ) as HTMLButtonElement;
    await act(async () => {
      open.click();
    });
    expect(opened).toEqual(['shop']);
  });
});
