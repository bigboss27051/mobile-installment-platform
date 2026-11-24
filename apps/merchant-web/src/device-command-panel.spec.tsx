import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceCommandPanel } from './device-command-panel';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeviceCommandPanel', () => {
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

  it('requires a reason before posting a command', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <I18nProvider>
          <DeviceCommandPanel deviceId="705f8cff-0000-4000-8000-000000000001" />
        </I18nProvider>,
      );
    });

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/reason|เหตุผล/i);
  });

  it('posts command with reason and shows queued id', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'cmd-lab-1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <I18nProvider>
          <DeviceCommandPanel deviceId="705f8cff-0000-4000-8000-000000000001" />
        </I18nProvider>,
      );
    });

    const reason = container.querySelector('#device-cmd-reason') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(reason, 'lab overdue restrict');
      reason.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const form = container.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      type: 'START_PACKAGE_SUSPEND',
      reason: 'lab overdue restrict',
    });
    expect(container.textContent).toContain('ส่งคำสั่งแล้ว รอเครื่องยืนยัน');
    expect(container.textContent).not.toContain('cmd-lab-1');
  });
});
