import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolicyPage } from './policy-page';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('PolicyPage', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.unstubAllGlobals();
  });

  it('shows settings form when GET settings succeeds', async () => {
    fetchMock.mockImplementation((input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/policy/lock-approvals')) {
        return jsonResponse(200, { data: [] });
      }
      if (url.includes('/policy/settings')) {
        return jsonResponse(200, {
          data: {
            tenantId: 't1',
            reminderAfterDays: 1,
            restrictAfterDays: 3,
            lockAfterDays: 7,
            autoEvaluateCronEnabled: true,
            requireLockApproval: true,
          },
        });
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
          <PolicyPage onError={() => undefined} apiError={(m) => m} />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('เกณฑ์ค้างชำระ');
    expect(container.textContent).toContain('บันทึก');
  });

  it('hides settings form when GET settings returns 403 but still lists approvals', async () => {
    fetchMock.mockImplementation((input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/policy/lock-approvals')) {
        return jsonResponse(200, {
          data: [
            {
              id: 'a1',
              deviceId: 'd1',
              contractId: 'c1',
              status: 'PENDING',
              overdueDays: 9,
              reason: 'ladder',
              requestedAt: '2026-11-22T00:00:00.000Z',
              maskedImei: '••••1234',
            },
          ],
        });
      }
      if (url.includes('/policy/settings')) {
        return jsonResponse(403, { error: { message: 'PERMISSION_DENIED' } });
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
          <PolicyPage onError={() => undefined} apiError={(m) => m} />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ไม่มีสิทธิ์แก้การตั้งค่านโยบาย');
    expect(container.textContent).toContain('••••1234');
    expect(container.textContent).toContain('อนุมัติ');
  });
});
