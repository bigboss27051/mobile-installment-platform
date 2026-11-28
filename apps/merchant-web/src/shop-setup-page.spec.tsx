import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from './i18n-context';
import { ShopSetupPage } from './shop-setup-page';
import { formatBangkokDateTime } from './format-bangkok-datetime';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const readyBody = {
  dpcAttested: true,
  googleAccountReady: true,
  wipeNeedsOnDeviceUnlock: true,
  noRemoteFrpBypass: true,
  ready: true,
  completedAt: '2026-11-28T03:00:00.000Z',
};

describe('ShopSetupPage', () => {
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

  function render() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    return container;
  }

  it('keeps save disabled until all four boxes are checked', async () => {
    fetchMock.mockImplementation(() => jsonResponse(200, { data: null }));
    vi.stubGlobal('fetch', fetchMock);
    const container = render();
    await act(async () => {
      root.render(
        <I18nProvider>
          <ShopSetupPage
            onError={() => undefined}
            apiError={(message) => message}
            onOpenEnroll={() => undefined}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ยังบันทึกไม่ครบ');
    const save = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('บันทึก'),
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const boxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      await act(async () => {
        box.click();
      });
    }
    expect(save.disabled).toBe(false);
  });

  it('shows the saved date and enroll and edit actions when the shop is ready', async () => {
    fetchMock.mockImplementation(() => jsonResponse(200, { data: readyBody }));
    vi.stubGlobal('fetch', fetchMock);
    const opened: string[] = [];
    const container = render();
    await act(async () => {
      root.render(
        <I18nProvider>
          <ShopSetupPage
            onError={() => undefined}
            apiError={(message) => message}
            onOpenEnroll={() => opened.push('enroll')}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const when = formatBangkokDateTime(readyBody.completedAt);
    expect(container.textContent).toContain('ร้านพร้อมลงทะเบียนเครื่องแอนดรอยด์');
    expect(container.textContent).toContain(when);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();

    const go = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('ไปหน้าลงทะเบียน'),
    ) as HTMLButtonElement;
    await act(async () => {
      go.click();
    });
    expect(opened).toEqual(['enroll']);
  });

  it('returns to the checklist after edit save clears one box', async () => {
    fetchMock.mockImplementation((input: RequestInfo, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'PUT') {
        const body = JSON.parse(String(init?.body)) as typeof readyBody;
        return jsonResponse(200, {
          data: {
            ...body,
            ready: false,
            completedAt: null,
          },
        });
      }
      return jsonResponse(200, { data: readyBody });
    });
    vi.stubGlobal('fetch', fetchMock);
    const container = render();
    await act(async () => {
      root.render(
        <I18nProvider>
          <ShopSetupPage
            onError={() => undefined}
            apiError={(message) => message}
            onOpenEnroll={() => undefined}
          />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const edit = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('แก้เช็กลิสต์'),
    ) as HTMLButtonElement;
    await act(async () => {
      edit.click();
    });
    const google = container.querySelector(
      '[data-testid="shop-setup-google"]',
    ) as HTMLInputElement;
    expect(google.checked).toBe(true);
    await act(async () => {
      google.click();
    });
    const save = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent ?? '').includes('บันทึก'),
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    await act(async () => {
      save.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ยังบันทึกไม่ครบ');
    expect(container.querySelector('[data-testid="shop-setup-google"]')).toBeTruthy();
    expect(container.textContent).not.toContain('ร้านพร้อมลงทะเบียน');
  });
});
