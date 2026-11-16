import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
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

function buttonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('merchant error notice and logout confirm', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = '';
    localStorage.clear();
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('shows an alert when an action fails and keeps the session when logout is cancelled', async () => {
    localStorage.setItem('mip.staff.accessToken', 'token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (String(path).includes('/contracts') && method === 'POST') {
        return jsonResponse(404, { error: { message: 'Contract not found.' } });
      }
      if (String(path).endsWith('/applications') && method === 'GET') {
        return jsonResponse(200, {
          data: [{ id: 'app-approved', status: 'APPROVED', customerId: 'cust-1' }],
        });
      }
      if (String(path).endsWith('/customers') && method === 'GET') {
        return jsonResponse(200, { data: [{ id: 'cust-1', fullName: 'สมชาย' }] });
      }
      if (String(path).endsWith('/contracts') && method === 'GET') {
        return jsonResponse(200, { data: [] });
      }
      return jsonResponse(200, { data: [] });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      );
    });
    expect(container.textContent).toContain('ยังไม่มีสัญญา');
    expect(container.textContent).toContain('สมชาย · APPROVED');

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('ไม่พบสัญญา');
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/applications/contracts'))).toBe(
      false,
    );
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]) === '/api/v1/applications/app-approved/contracts' &&
          call[1]?.method === 'POST',
      ),
    ).toBe(true);

    await act(async () => {
      buttonByText(container.querySelector('nav') as ParentNode, 'ออกจากระบบ')?.click();
    });
    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('ออกจากระบบ?');
    expect(localStorage.getItem('mip.staff.accessToken')).toBe('token');

    await act(async () => {
      buttonByText(dialog as ParentNode, 'อยู่ต่อ')?.click();
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(container.textContent).not.toContain('เข้าสู่ระบบร้านค้า');
    expect(localStorage.getItem('mip.staff.accessToken')).toBe('token');
    expect(container.textContent).toContain('สร้างสัญญา');
  });

  it('logs out only after the confirm button', async () => {
    localStorage.setItem('mip.staff.accessToken', 'token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(() => jsonResponse(200, { data: [] }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      );
    });

    await act(async () => {
      buttonByText(container.querySelector('nav') as ParentNode, 'ออกจากระบบ')?.click();
    });
    const dialog = container.querySelector('[role="alertdialog"]');
    await act(async () => {
      buttonByText(dialog as ParentNode, 'ออกจากระบบ')?.click();
    });

    expect(localStorage.getItem('mip.staff.accessToken')).toBeNull();
    expect(container.textContent).toContain('เข้าสู่ระบบร้านค้า');
  });

  it('does not post /applications/contracts when no approved application is selected', async () => {
    localStorage.setItem('mip.staff.accessToken', 'token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(() => jsonResponse(200, { data: [] }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      );
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/applications/'))).toBe(
      false,
    );
    expect(container.textContent).toContain('เลือกคำขอที่อนุมัติแล้ว');
  });

  it('creates an application from the customer, stock device, and plan pickers', async () => {
    localStorage.setItem('mip.staff.accessToken', 'token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST' && String(path) === '/api/v1/applications') {
        return jsonResponse(201, { data: { id: 'app-new', status: 'DRAFT', customerId: 'cust-ok' } });
      }
      if (String(path).endsWith('/customers')) {
        return jsonResponse(200, {
          data: [
            { id: 'cust-ok', fullName: 'สมชาย', phone: '0811111111' },
            { id: 'cust-wait', fullName: 'ยังไม่อนุมัติ', phone: '0822222222' },
          ],
        });
      }
      if (String(path).endsWith('/kyc-cases')) {
        return jsonResponse(200, {
          data: [{ customerId: 'cust-ok', status: 'APPROVED' }],
        });
      }
      if (String(path).includes('/inventory/imeis')) {
        return jsonResponse(200, {
          data: [{ id: 'imei-1', imei: '356938035643809', serial: null }],
        });
      }
      if (String(path).endsWith('/installment-plans')) {
        return jsonResponse(200, {
          data: [{ id: 'plan-1', code: 'FLAT-6', name: 'ผ่อน 6 เดือน', termMonths: 6 }],
        });
      }
      if (String(path).endsWith('/applications') && method === 'GET') {
        return jsonResponse(200, { data: [] });
      }
      return jsonResponse(200, { data: [] });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      );
    });
    await act(async () => {
      buttonByText(container.querySelector('nav') as ParentNode, 'คำขอผ่อน')?.click();
    });

    expect(container.textContent).toContain('สมชาย · 0811111111');
    expect(container.textContent).not.toContain('ยังไม่อนุมัติ');
    expect(container.textContent).toContain('356938035643809');
    expect(container.textContent).toContain('ผ่อน 6 เดือน · FLAT-6 · 6');
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('status=AVAILABLE')),
    ).toBe(true);

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const post = fetchMock.mock.calls.find(
      (call) => call[1]?.method === 'POST' && String(call[0]) === '/api/v1/applications',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      customerId: 'cust-ok',
      imeiUnitId: 'imei-1',
      planId: 'plan-1',
      principal: '12000.00',
      downPayment: '2000.00',
    });
  });
});
