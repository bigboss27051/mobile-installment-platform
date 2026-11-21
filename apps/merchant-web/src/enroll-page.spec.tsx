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

  it('blocks create session until Android FRP checklist is complete', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
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
      fetchMock.mock.calls.some((call) => String(call[0]).includes('enrollment-sessions')),
    ).toBe(false);

    await checkConsentAndFrp(container);
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('enrollment-sessions')),
    ).toBe(true);
  });
});
