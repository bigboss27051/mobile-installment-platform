import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { DeviceStatusPanel } from './device-status-panel';
import { useI18n } from './i18n-context';
import { EmptyState, Page, Section, Spinner, Table } from './ui';

type DeviceRow = {
  id: string;
  platform: string;
  status: string;
  enrollmentStatus: string;
  desiredPresentation: string;
  platformState: string;
  lastHeartbeatAt: string | null;
  maskedImei: string | null;
};

export function DevicesPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<DeviceRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<DeviceRow[]>('/api/v1/devices');
        setRows(data);
        onError(null);
      } catch (err) {
        onError(err instanceof ApiError ? apiError(err.message) : t('devices.loadFailed'));
        setRows([]);
      }
    })();
  }, [apiError, onError, t]);

  return (
    <Page title={t('devices.title')}>
      <Section>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('devices.empty')}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('devices.colImei')}</th>
                <th>{t('devices.colPlatform')}</th>
                <th>{t('devices.colStatus')}</th>
                <th>{t('devices.colDesired')}</th>
                <th>{t('devices.colHeartbeat')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.maskedImei ?? '—'}</td>
                  <td>{row.platform}</td>
                  <td>{row.status}</td>
                  <td>{row.desiredPresentation}</td>
                  <td>{row.lastHeartbeatAt ?? t('deviceStatus.heartbeatNever')}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedId(row.id)}>
                      {t('devices.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
      {selectedId ? <DeviceStatusPanel deviceId={selectedId} /> : null}
    </Page>
  );
}
