import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { useI18n } from './i18n-context';
import { Alert, Section } from './ui';

export type DeviceDashboard = {
  id: string;
  platform: string;
  status: string;
  enrollmentStatus: string;
  desiredPresentation: string;
  platformState: string;
  policyVersion: number;
  lastHeartbeatAt: string | null;
  maskedImei: string | null;
};

export function DeviceStatusPanel({ deviceId }: { deviceId: string }) {
  const { t } = useI18n();
  const [dash, setDash] = useState<DeviceDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiRequest<DeviceDashboard>(`/api/v1/devices/${deviceId}`);
        if (!cancelled) {
          setDash(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('deviceStatus.loadFailed'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, t]);

  return (
    <Section title={t('deviceStatus.title')}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {dash ? (
        <dl className="mip-form-grid">
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
            <dt>{t('deviceStatus.imei')}</dt>
            <dd>{dash.maskedImei ?? '—'}</dd>
          </div>
        </dl>
      ) : !error ? (
        <p>{t('deviceStatus.loading')}</p>
      ) : null}
    </Section>
  );
}
