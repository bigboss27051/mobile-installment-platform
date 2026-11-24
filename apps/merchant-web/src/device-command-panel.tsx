import { FormEvent, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { ApiError, apiRequest } from './api';
import { displayStatus } from './i18n';
import { useI18n } from './i18n-context';
import { Alert, Button, FormField, Input, Section, Select } from './ui';
import { MIP_TOKENS } from './ui/theme';

const COMMAND_TYPES = [
  'START_LOCK_TASK',
  'STOP_LOCK_TASK',
  'START_PACKAGE_SUSPEND',
  'STOP_PACKAGE_SUSPEND',
] as const;

type CommandType = (typeof COMMAND_TYPES)[number];

const PENDING_STATUSES = new Set(['QUEUED', 'SENT']);

type TrackedCommand = {
  id: string;
  type: string;
  status: string;
  resultCode: string | null;
};

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
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tracked || !PENDING_STATUSES.has(tracked.status)) {
      return undefined;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiRequest<{ lastCommand?: TrackedCommand | null }>(
          `/api/v1/devices/${deviceId}`,
        );
        const last = data.lastCommand;
        if (!cancelled && last?.id === tracked.id && last.status !== tracked.status) {
          setTracked({
            id: last.id,
            type: last.type,
            status: last.status,
            resultCode: last.resultCode,
          });
          if (!PENDING_STATUSES.has(last.status)) {
            onEnqueued?.();
          }
        }
      } catch {
        // Keep the waiting notice until the device answers or the page closes.
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deviceId, onEnqueued, tracked]);

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
      setTracked({
        id: command.id,
        type,
        status: 'QUEUED',
        resultCode: null,
      });
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
      {tracked ? (
        <Alert
          tone={
            tracked.status === 'ACKED_SUCCESS' || PENDING_STATUSES.has(tracked.status)
              ? 'success'
              : 'error'
          }
        >
          {PENDING_STATUSES.has(tracked.status)
            ? t('deviceCommand.queued')
            : `${displayStatus(t, 'command', tracked.type)} · ${displayStatus(
                t,
                'commandStatus',
                tracked.status,
              )}${tracked.resultCode ? ` · ${tracked.resultCode}` : ''}`}
        </Alert>
      ) : null}
      <Stack component="form" spacing={2} sx={{ maxWidth: MIP_TOKENS.formMax }} onSubmit={onSubmit}>
        <FormField label={t('deviceCommand.type')} htmlFor="device-cmd-type" required>
          <Select
            id="device-cmd-type"
            value={type}
            onChange={(e) => setType(e.target.value as CommandType)}
          >
            {COMMAND_TYPES.map((value) => (
              <option key={value} value={value}>
                {displayStatus(t, 'command', value)}
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('deviceCommand.submitting') : t('deviceCommand.submit')}
          </Button>
        </Stack>
      </Stack>
    </Section>
  );
}
