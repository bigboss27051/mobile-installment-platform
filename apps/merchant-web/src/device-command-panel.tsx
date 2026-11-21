import { FormEvent, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { useI18n } from './i18n-context';
import { Alert, Button, FormField, Input, Section, Select } from './ui';

const COMMAND_TYPES = [
  'START_LOCK_TASK',
  'STOP_LOCK_TASK',
  'START_PACKAGE_SUSPEND',
  'STOP_PACKAGE_SUSPEND',
] as const;

type CommandType = (typeof COMMAND_TYPES)[number];

export function DeviceCommandPanel({
  deviceId,
  onEnqueued,
}: {
  deviceId: string;
  onEnqueued?: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<CommandType>('START_PACKAGE_SUSPEND');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('deviceCommand.needReason'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const command = await apiRequest<{ id: string }>(`/api/v1/devices/${deviceId}/commands`, {
        method: 'POST',
        body: JSON.stringify({ type, reason: trimmed }),
      });
      setLastId(command.id);
      setReason('');
      onEnqueued?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deviceCommand.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t('deviceCommand.title')}>
      <p>{t('deviceCommand.hint')}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {lastId ? (
        <Alert tone="success">{t('deviceCommand.queued', { id: lastId })}</Alert>
      ) : null}
      <form className="mip-form-grid" onSubmit={onSubmit}>
        <FormField label={t('deviceCommand.type')} htmlFor="device-cmd-type" required>
          <Select
            id="device-cmd-type"
            value={type}
            onChange={(e) => setType(e.target.value as CommandType)}
          >
            {COMMAND_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('deviceCommand.reason')} htmlFor="device-cmd-reason" required>
          <Input
            id="device-cmd-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('deviceCommand.reasonPlaceholder')}
          />
        </FormField>
        <div className="mip-form-actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('deviceCommand.submitting') : t('deviceCommand.submit')}
          </Button>
        </div>
      </form>
    </Section>
  );
}
