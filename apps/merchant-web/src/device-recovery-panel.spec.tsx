import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceRecoveryPanel } from './device-recovery-panel';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeviceRecoveryPanel', () => {
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

  it('requires a reason before posting recovery', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <I18nProvider>
          <DeviceRecoveryPanel deviceId="705f8cff-0000-4000-8000-000000000001" />
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

  it('posts recovery with type and reason and shows id', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'rec-lab-1' } }), {
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
          <DeviceRecoveryPanel deviceId="705f8cff-0000-4000-8000-000000000001" />
        </I18nProvider>,
      );
    });

    const typeSelect = container.querySelector('#device-recovery-type') as HTMLSelectElement;
    await act(async () => {
      typeSelect.value = 'UNENROLL';
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const reason = container.querySelector('#device-recovery-reason') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(reason, 'lab unenroll after payoff');
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
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/recovery-requests');
    expect(JSON.parse(String(init.body))).toEqual({
      type: 'UNENROLL',
      reason: 'lab unenroll after payoff',
    });
    expect(container.textContent).toContain('บันทึกคำขอกู้คืนแล้ว');
    expect(container.textContent).not.toContain('rec-lab-1');
  });
});
