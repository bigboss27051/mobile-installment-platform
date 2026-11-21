import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceStatusPanel } from './device-status-panel';
import { I18nProvider } from './i18n-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeviceStatusPanel', () => {
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

  it('renders desired policy and heartbeat from GET /devices/:id', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: '705f8cff-0000-4000-8000-000000000001',
            platform: 'ANDROID',
            status: 'ACTIVE',
            enrollmentStatus: 'COMPLETED',
            desiredPresentation: 'LOCK',
            platformState: 'LOCK_TASK',
            policyVersion: 4,
            lastHeartbeatAt: '2026-11-21T12:00:00.000Z',
            lastKnownLocation: {
              lat: 13.7563,
              lng: 100.5018,
              accuracyMeters: 120,
              source: 'NETWORK',
              capturedAt: '2026-11-21T12:00:00.000Z',
            },
            maskedImei: '••••9999',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <I18nProvider>
          <DeviceStatusPanel deviceId="705f8cff-0000-4000-8000-000000000001" />
        </I18nProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(container.textContent).toContain('LOCK');
    expect(container.textContent).toContain('LOCK_TASK');
    expect(container.textContent).toContain('2026-11-21T12:00:00.000Z');
    expect(container.textContent).toContain('13.75630');
    expect(container.textContent).toContain('NETWORK');
  });
});
