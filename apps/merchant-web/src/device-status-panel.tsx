import { useCallback, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { ApiError, apiRequest } from './api';
import { DeviceCommandPanel } from './device-command-panel';
import { useI18n } from './i18n-context';
import { Alert, Section } from './ui';
import { MIP_TOKENS } from './ui/theme';

export type LastKnownLocation = {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  source: string;
  capturedAt: string;
};

export type DeviceDashboard = {
  id: string;
  platform: string;
  status: string;
  enrollmentStatus: string;
  desiredPresentation: string;
  platformState: string;
  policyVersion: number;
  lastHeartbeatAt: string | null;
  lastKnownLocation?: LastKnownLocation | null;
  locationUpdatedAt?: string | null;
  lastCommand?: {
    id: string;
    type: string;
    status: string;
    resultCode: string | null;
    ackedAt: string | null;
  } | null;
  maskedImei: string | null;
};

type LocationHistorySample = {
  id: string;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  source: string;
  capturedAt: string;
};

export function DeviceStatusPanel({ deviceId }: { deviceId: string }) {
  const { t } = useI18n();
  const [dash, setDash] = useState<DeviceDashboard | null>(null);
  const [history, setHistory] = useState<LocationHistorySample[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<DeviceDashboard>(`/api/v1/devices/${deviceId}`);
      setDash(data);
      setError(null);
      try {
        const hist = await apiRequest<{ samples: LocationHistorySample[] }>(
          `/api/v1/devices/${deviceId}/location-history`,
        );
        setHistory(hist.samples);
      } catch {
        setHistory(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deviceStatus.loadFailed'));
    }
  }, [deviceId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loc = dash?.lastKnownLocation;

  return (
    <>
      <Section title={t('deviceStatus.title')}>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {dash ? (
          <Stack component="dl" spacing={2} sx={{ maxWidth: MIP_TOKENS.formMax }}>
            <div>
              <dt>{t('deviceStatus.id')}</dt>
              <dd>{dash.id}</dd>
            </div>
            <div>
              <dt>{t('deviceStatus.desired')}</dt>
              <dd>{dash.desiredPresentation}</dd>
            </div>
            <div>
              <dt>{t('deviceStatus.platform')}</dt>
              <dd>{dash.platformState}</dd>
            </div>
            <div>
              <dt>{t('deviceStatus.policyVersion')}</dt>
              <dd>{dash.policyVersion}</dd>
            </div>
            <div>
              <dt>{t('deviceStatus.heartbeat')}</dt>
              <dd>{dash.lastHeartbeatAt ?? t('deviceStatus.heartbeatNever')}</dd>
            </div>
            <div>
              <dt>{t('deviceStatus.lastKnownLocation')}</dt>
              <dd>
                {loc
                  ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} · ${loc.source} · ±${
                      loc.accuracyMeters ?? '?'
                    }m · ${loc.capturedAt}`
                  : t('deviceStatus.lastKnownLocationNone')}
              </dd>
            </div>
            <div>
              <dt>{t('deviceStatus.lastCommand')}</dt>
              <dd>
                {dash.lastCommand
                  ? `${dash.lastCommand.type} · ${dash.lastCommand.status}${
                      dash.lastCommand.resultCode
                        ? ` · ${dash.lastCommand.resultCode}`
                        : ''
                    }`
                  : t('deviceStatus.lastCommandNone')}
              </dd>
            </div>
            <div>
              <dt>{t('deviceStatus.imei')}</dt>
              <dd>{dash.maskedImei ?? '—'}</dd>
            </div>
          </Stack>
        ) : !error ? (
          <p>{t('deviceStatus.loading')}</p>
        ) : null}
      </Section>
      {history && history.length > 0 ? (
        <Section title={t('deviceStatus.locationHistory')}>
          <ul>
            {history.slice(0, 20).map((s) => (
              <li key={s.id}>
                {s.lat.toFixed(5)}, {s.lng.toFixed(5)} · {s.source} · {s.capturedAt}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <DeviceCommandPanel deviceId={deviceId} onEnqueued={() => void refresh()} />
    </>
  );
}
