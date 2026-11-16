import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from './i18n-context';
import { KycPanel } from './kyc-panel';

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

describe('KycPanel', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = '';
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  async function renderPanel(onError: (message: string | null) => void = () => undefined) {
    localStorage.setItem('mip.staff.accessToken', 'token');
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <KycPanel
            customerId="cust-1"
            customerName="สมชาย"
            onError={onError}
            apiError={(message) => message}
            onUpdated={async () => undefined}
          />
        </I18nProvider>,
      );
    });
    return container;
  }

  it('opens a case, uploads a document, submits for review, and approves', async () => {
    vi.stubGlobal('fetch', fetchMock);
    let status = 'NONE';
    let documents: { id: string; type: string }[] = [];
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const url = String(path);
      if (method === 'POST' && url === '/api/v1/customers/cust-1/kyc-cases') {
        status = 'DRAFT';
        return jsonResponse(201, { data: { id: 'case-1', customerId: 'cust-1', status } });
      }
      if (method === 'POST' && url === '/api/v1/kyc-cases/case-1/documents') {
        documents = [{ id: 'doc-1', type: 'ID_FRONT' }];
        return jsonResponse(201, { data: documents[0] });
      }
      if (method === 'POST' && url === '/api/v1/kyc-cases/case-1/submit') {
        status = 'SUBMITTED';
        return jsonResponse(201, { data: { id: 'case-1', status } });
      }
      if (method === 'POST' && url === '/api/v1/kyc-cases/case-1/ocr') {
        status = 'IN_REVIEW';
        return jsonResponse(201, { data: { id: 'case-1', status } });
      }
      if (method === 'POST' && url === '/api/v1/kyc-cases/case-1/review') {
        status = 'APPROVED';
        return jsonResponse(201, { data: { id: 'case-1', status } });
      }
      if (method === 'GET' && url === '/api/v1/kyc-cases') {
        return jsonResponse(200, {
          data: status === 'NONE' ? [] : [{ id: 'case-1', customerId: 'cust-1', status }],
        });
      }
      if (method === 'GET' && url === '/api/v1/kyc-cases/case-1') {
        return jsonResponse(200, {
          data: { id: 'case-1', customerId: 'cust-1', status, documents },
        });
      }
      return jsonResponse(404, { error: { message: 'Request failed' } });
    });

    const container = await renderPanel();
    expect(container.textContent).toContain('ยังไม่เริ่ม');

    await act(async () => {
      buttonByText(container, 'เปิดเคส KYC')?.click();
    });
    expect(container.textContent).toContain('ฉบับร่าง');

    const fileInput = container.querySelector('#kyc-file') as HTMLInputElement;
    const file = new File(['png'], 'id.png', { type: 'image/png' });
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const upload = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/documents'));
    const body = upload?.[1]?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('type')).toBe('ID_FRONT');
    expect(body.get('file')).toBe(file);
    expect(container.textContent).toContain('บัตรด้านหน้า');

    await act(async () => {
      buttonByText(container, 'ส่งตรวจ')?.click();
    });
    expect(container.textContent).toContain('รออนุมัติ');
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/ocr'))).toBe(true);

    await act(async () => {
      buttonByText(container, 'อนุมัติ KYC')?.click();
    });
    expect(container.textContent).toContain('อนุมัติแล้ว');
    const review = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/review'));
    expect(JSON.parse(String(review?.[1]?.body))).toEqual({
      decision: 'APPROVE',
      reason: 'อนุมัติจากเว็บร้าน',
    });
  });
});
