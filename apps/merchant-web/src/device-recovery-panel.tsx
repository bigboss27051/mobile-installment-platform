import { FormEvent, useState } from 'react';
import Stack from '@mui/material/Stack';
import { ApiError, apiRequest } from './api';
import { useI18n } from './i18n-context';
import { Alert, Button, FormField, Input, Section, Select } from './ui';
import { MIP_TOKENS } from './ui/theme';

const RECOVERY_TYPES = [
  'REENROLL',
  'REPLACE',
  'UNENROLL',
  'RELEASE',
  'CONTRACT_CLOSE',
] as const;

type RecoveryType = (typeof RECOVERY_TYPES)[number];

export function DeviceRecoveryPanel({
  deviceId,
  onSubmitted,
}: {
  deviceId: string;
  onSubmitted?: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<RecoveryType>('REENROLL');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('deviceRecovery.needReason'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const recovery = await apiRequest<{ id: string }>(
        `/api/v1/devices/${deviceId}/recovery-requests`,
        {
          method: 'POST',
          body: JSON.stringify({ type, reason: trimmed }),
        },
      );
      setLastId(recovery.id);
      setReason('');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deviceRecovery.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t('deviceRecovery.title')}>
      <p>{t('deviceRecovery.hint')}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {lastId ? (
        <Alert tone="success">{t('deviceRecovery.approved', { id: lastId })}</Alert>
      ) : null}
      <Stack component="form" spacing={2} sx={{ maxWidth: MIP_TOKENS.formMax }} onSubmit={onSubmit}>
        <FormField label={t('deviceRecovery.type')} htmlFor="device-recovery-type" required>
          <Select
            id="device-recovery-type"
            value={type}
            onChange={(e) => setType(e.target.value as RecoveryType)}
          >
            {RECOVERY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('deviceRecovery.reason')} htmlFor="device-recovery-reason" required>
          <Input
            id="device-recovery-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('deviceRecovery.reasonPlaceholder')}
          />
        </FormField>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('deviceRecovery.submitting') : t('deviceRecovery.submit')}
          </Button>
        </Stack>
      </Stack>
    </Section>
  );
}
