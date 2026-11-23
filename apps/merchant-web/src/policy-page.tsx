import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest, withIdempotency } from './api';
import { useI18n } from './i18n-context';
import {
  Alert,
  Button,
  FormField,
  Input,
  Page,
  Section,
  Spinner,
  Table,
} from './ui';

type PolicySettings = {
  tenantId: string;
  reminderAfterDays: number;
  restrictAfterDays: number;
  lockAfterDays: number;
  autoEvaluateCronEnabled: boolean;
  requireLockApproval: boolean;
};

type LockApprovalRow = {
  id: string;
  deviceId: string;
  contractId: string;
  status: string;
  overdueDays: number;
  reason: string;
  requestedAt: string;
  maskedImei: string | null;
};

export function PolicyPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderAfterDays, setReminderAfterDays] = useState('1');
  const [restrictAfterDays, setRestrictAfterDays] = useState('3');
  const [lockAfterDays, setLockAfterDays] = useState('7');
  const [autoEvaluateCronEnabled, setAutoEvaluateCronEnabled] = useState(true);
  const [requireLockApproval, setRequireLockApproval] = useState(true);
  const [approvals, setApprovals] = useState<LockApprovalRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    onError(null);
    try {
      const rows = await apiRequest<LockApprovalRow[]>(
        '/api/v1/devices/policy/lock-approvals?status=PENDING',
      );
      setApprovals(rows);
    } catch (err) {
      onError(
        err instanceof ApiError
          ? apiError(err.message)
          : t('policy.loadQueueFailed'),
      );
    }

    try {
      const settings = await apiRequest<PolicySettings>(
        '/api/v1/devices/policy/settings',
      );
      setCanEdit(true);
      setReminderAfterDays(String(settings.reminderAfterDays));
      setRestrictAfterDays(String(settings.restrictAfterDays));
      setLockAfterDays(String(settings.lockAfterDays));
      setAutoEvaluateCronEnabled(settings.autoEvaluateCronEnabled);
      setRequireLockApproval(settings.requireLockApproval);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCanEdit(false);
      } else {
        onError(
          err instanceof ApiError
            ? apiError(err.message)
            : t('policy.loadSettingsFailed'),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    onError(null);
    try {
      const updated = await apiRequest<PolicySettings>(
        '/api/v1/devices/policy/settings',
        {
          method: 'PUT',
          body: JSON.stringify({
            reminderAfterDays: Number(reminderAfterDays),
            restrictAfterDays: Number(restrictAfterDays),
            lockAfterDays: Number(lockAfterDays),
            autoEvaluateCronEnabled,
            requireLockApproval,
          }),
        },
      );
      setReminderAfterDays(String(updated.reminderAfterDays));
      setRestrictAfterDays(String(updated.restrictAfterDays));
      setLockAfterDays(String(updated.lockAfterDays));
      setAutoEvaluateCronEnabled(updated.autoEvaluateCronEnabled);
      setRequireLockApproval(updated.requireLockApproval);
    } catch (err) {
      onError(
        err instanceof ApiError ? apiError(err.message) : t('policy.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function resolveApproval(
    id: string,
    action: 'approve' | 'reject',
  ) {
    const reason =
      action === 'approve'
        ? window.prompt(t('policy.approveReasonPrompt'))
        : window.prompt(t('policy.rejectReasonPrompt'));
    if (!reason?.trim()) return;
    setBusyId(id);
    onError(null);
    try {
      await apiRequest(`/api/v1/devices/policy/lock-approvals/${id}/${action}`, {
        ...withIdempotency({
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        }),
      });
      await load();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? apiError(err.message)
          : t('policy.resolveFailed'),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <Page title={t('policy.title')}>
        <Spinner />
      </Page>
    );
  }

  return (
    <Page title={t('policy.title')}>
      {canEdit ? (
        <Section title={t('policy.settingsSection')}>
          <form onSubmit={onSave}>
            <FormField label={t('policy.reminderDays')} htmlFor="policy-reminder-days">
              <Input
                id="policy-reminder-days"
                type="number"
                min={1}
                max={365}
                value={reminderAfterDays}
                onChange={(e) => setReminderAfterDays(e.target.value)}
                required
              />
            </FormField>
            <FormField label={t('policy.restrictDays')} htmlFor="policy-restrict-days">
              <Input
                id="policy-restrict-days"
                type="number"
                min={1}
                max={365}
                value={restrictAfterDays}
                onChange={(e) => setRestrictAfterDays(e.target.value)}
                required
              />
            </FormField>
            <FormField label={t('policy.lockDays')} htmlFor="policy-lock-days">
              <Input
                id="policy-lock-days"
                type="number"
                min={1}
                max={365}
                value={lockAfterDays}
                onChange={(e) => setLockAfterDays(e.target.value)}
                required
              />
            </FormField>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={autoEvaluateCronEnabled}
                onChange={(e) => setAutoEvaluateCronEnabled(e.target.checked)}
              />{' '}
              {t('policy.cronEnabled')}
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={requireLockApproval}
                onChange={(e) => setRequireLockApproval(e.target.checked)}
              />{' '}
              {t('policy.requireLockApproval')}
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? t('policy.saving') : t('policy.save')}
            </Button>
          </form>
        </Section>
      ) : (
        <Alert tone="info">{t('policy.settingsForbidden')}</Alert>
      )}

      <Section title={t('policy.queueTitle')}>
        {approvals.length === 0 ? (
          <p>{t('policy.emptyQueue')}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('policy.colImei')}</th>
                <th>{t('policy.colDays')}</th>
                <th>{t('policy.colReason')}</th>
                <th>{t('policy.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((row) => (
                <tr key={row.id}>
                  <td>{row.maskedImei ?? '—'}</td>
                  <td>{row.overdueDays}</td>
                  <td>{row.reason}</td>
                  <td>
                    <Button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void resolveApproval(row.id, 'approve')}
                    >
                      {t('policy.approve')}
                    </Button>{' '}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() => void resolveApproval(row.id, 'reject')}
                    >
                      {t('policy.reject')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </Page>
  );
}
