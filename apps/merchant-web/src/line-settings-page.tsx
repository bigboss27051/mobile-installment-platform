import { FormEvent, useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ApiError, apiRequest, withIdempotency } from './api';
import { displayStatus } from './i18n';
import { useI18n } from './i18n-context';
import { buildLineWebhookUrl, resolveApiOrigin } from './line-webhook-url';
import {
  Alert,
  Button,
  FormField,
  Input,
  Page,
  Section,
  Select,
  Spinner,
} from './ui';

type LineConfig = {
  status: string;
  channelId: string | null;
  maskedSecret: string | null;
  lastWebhookAt: string | null;
  lastError: string | null;
};

type TenantMe = {
  id: string;
  name: string;
  slug: string;
};

type ContractRow = {
  id: string;
  contractNumber?: string;
  status: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LineSettingsPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [config, setConfig] = useState<LineConfig | null>(null);
  const [tenant, setTenant] = useState<TenantMe | null>(null);
  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'webhook' | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [reminderContractId, setReminderContractId] = useState('');
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [apiOrigin, setApiOrigin] = useState(() => {
    const stored = localStorage.getItem('mip.line.apiOrigin');
    if (stored?.trim()) return stored.trim().replace(/\/$/, '');
    return resolveApiOrigin(
      typeof window !== 'undefined' ? window.location.origin : '',
      import.meta.env.VITE_API_ORIGIN as string | undefined,
    );
  });

  const webhookUrl = useMemo(() => {
    if (!tenant?.id || !apiOrigin) return '';
    return buildLineWebhookUrl(apiOrigin, tenant.id);
  }, [tenant?.id, apiOrigin]);

  async function load() {
    try {
      const [lineConfig, me, contractRows] = await Promise.all([
        apiRequest<LineConfig>('/api/v1/line/config'),
        apiRequest<TenantMe>('/api/v1/tenants/me'),
        apiRequest<ContractRow[]>('/api/v1/contracts'),
      ]);
      setConfig(lineConfig);
      setTenant(me);
      setChannelId(lineConfig.channelId ?? '');
      const active = contractRows.filter((c) => c.status === 'ACTIVE');
      setContracts(active.length > 0 ? active : contractRows);
      setReminderContractId((current) => {
        const list = active.length > 0 ? active : contractRows;
        if (list.some((c) => c.id === current)) return current;
        return list[0]?.id ?? '';
      });
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.loadFailed'));
      setConfig({
        status: 'DISCONNECTED',
        channelId: null,
        maskedSecret: null,
        lastWebhookAt: null,
        lastError: null,
      });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiRequest<LineConfig>('/api/v1/line/config', {
        method: 'PUT',
        body: JSON.stringify({ channelId, channelSecret, accessToken }),
      });
      setConfig(data);
      setChannelSecret('');
      setAccessToken('');
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function onDisconnect() {
    setSaving(true);
    try {
      const data = await apiRequest<LineConfig>('/api/v1/line/config', {
        method: 'DELETE',
      });
      setConfig(data);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.disconnectFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function onCopyWebhook() {
    if (!webhookUrl) return;
    const ok = await copyText(webhookUrl);
    if (ok) {
      setCopied('webhook');
      window.setTimeout(() => setCopied(null), 2000);
    } else {
      onError(t('line.copyFailed'));
    }
  }

  async function onSendReminder() {
    if (!reminderContractId) return;
    setReminderBusy(true);
    setReminderResult(null);
    try {
      const result = await apiRequest<{
        data?: { status?: string };
        replay?: boolean;
      }>(
        '/api/v1/line/notifications/reminder',
        withIdempotency({
          method: 'POST',
          body: JSON.stringify({ contractId: reminderContractId }),
        }),
      );
      // Controller wraps deliver() → apiRequest unwraps once → { data: deliveryRow, replay }
      const status = result.data?.status ?? 'SENT';
      setReminderResult(status);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.reminderFailed'));
    } finally {
      setReminderBusy(false);
    }
  }

  if (!config) {
    return (
      <Page title={t('line.title')}>
        <Spinner />
      </Page>
    );
  }

  return (
    <Page title={t('line.title')}>
      <Section title={t('line.statusSection')}>
        <p>
          {t('line.status')}: <strong>{displayStatus(t, 'line', config.status)}</strong>
        </p>
        {tenant ? (
          <p>
            {t('line.shop')}: {tenant.name} ({tenant.slug})
          </p>
        ) : null}
        <p>
          {t('line.channelId')}: {config.channelId ?? '—'}
        </p>
        <p>
          {t('line.maskedSecret')}: {config.maskedSecret ?? '—'}
        </p>
        <p>
          {t('line.lastWebhook')}:{' '}
          {config.lastWebhookAt
            ? new Date(config.lastWebhookAt).toLocaleString()
            : t('line.webhookNever')}
        </p>
        {config.lastError ? <Alert tone="error">{config.lastError}</Alert> : null}
        <Alert tone="info">{t('line.sandboxNote')}</Alert>
      </Section>

      <Section title={t('line.setupSection')}>
        <ol className="mip-setup-list">
          <li>{t('line.setupStep1')}</li>
          <li>{t('line.setupStep2')}</li>
          <li>{t('line.setupStep3')}</li>
          <li>{t('line.setupStep4')}</li>
          <li>{t('line.setupStep5')}</li>
        </ol>
      </Section>

      <Section title={t('line.connectSection')}>
        <form onSubmit={onSave}>
          <Stack spacing={2}>
            <FormField label={t('line.channelId')} htmlFor="line-channel-id" required>
              <Input
                id="line-channel-id"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                required
                autoComplete="off"
              />
            </FormField>
            <FormField
              label={t('line.channelSecret')}
              htmlFor="line-channel-secret"
              required
              helperText={t('line.secretHelper')}
            >
              <Input
                id="line-channel-secret"
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                required
                autoComplete="off"
              />
            </FormField>
            <FormField label={t('line.accessToken')} htmlFor="line-access-token" required>
              <Input
                id="line-access-token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
                autoComplete="off"
              />
            </FormField>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <Button type="submit" disabled={saving}>
                {t('line.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || config.status === 'DISCONNECTED'}
                onClick={() => void onDisconnect()}
              >
                {t('line.disconnect')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Section>

      <Section title={t('line.webhookSection')}>
        <p>{t('line.webhookHelp')}</p>
        <Stack spacing={2}>
          <FormField
            label={t('line.apiOrigin')}
            htmlFor="line-api-origin"
            helperText={t('line.apiOriginHelper')}
          >
            <Input
              id="line-api-origin"
              value={apiOrigin}
              onChange={(e) => {
                const next = e.target.value.trim().replace(/\/$/, '');
                setApiOrigin(next);
                localStorage.setItem('mip.line.apiOrigin', next);
              }}
              placeholder="https://api.your-shop.example"
              autoComplete="off"
            />
          </FormField>
          <FormField label={t('line.webhookUrl')} htmlFor="line-webhook-url">
            <Input id="line-webhook-url" value={webhookUrl} readOnly />
          </FormField>
          <Typography variant="body2" color="text.secondary">
            {t('line.webhookSignature')}
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Button type="button" variant="secondary" disabled={!webhookUrl} onClick={() => void onCopyWebhook()}>
              {copied === 'webhook' ? t('line.copied') : t('line.copyWebhook')}
            </Button>
          </Stack>
          {!tenant?.id ? <Alert tone="error">{t('line.tenantMissing')}</Alert> : null}
        </Stack>
      </Section>

      <Section title={t('line.commandsSection')}>
        <p>{t('line.commandsHelp')}</p>
        <ul>
          <li>
            <code>LINK &lt;token&gt;</code> — {t('line.cmdLink')}
          </li>
          <li>
            <code>BALANCE</code> / {t('line.cmdBalanceTh')} — {t('line.cmdBalance')}
          </li>
          <li>
            <code>NEXT</code> / {t('line.cmdNextTh')} — {t('line.cmdNext')}
          </li>
          <li>
            <code>HISTORY</code> / {t('line.cmdHistoryTh')} — {t('line.cmdHistory')}
          </li>
          <li>
            <code>HELP</code> — {t('line.cmdHelp')}
          </li>
        </ul>
        <Alert tone="info">{t('line.linkFromCustomers')}</Alert>
      </Section>

      <Section title={t('line.reminderSection')}>
        <p>{t('line.reminderHelp')}</p>
        {contracts.length === 0 ? (
          <Alert tone="info">{t('line.reminderNoContracts')}</Alert>
        ) : (
          <>
            <FormField label={t('line.reminderContract')} htmlFor="line-reminder-contract">
              <Select
                id="line-reminder-contract"
                value={reminderContractId}
                onChange={(e) => setReminderContractId(e.target.value)}
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber ?? '—'} ({displayStatus(t, 'contract', c.status)})
                  </option>
                ))}
              </Select>
            </FormField>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button
                type="button"
                disabled={reminderBusy || !reminderContractId || config.status !== 'CONNECTED'}
                onClick={() => void onSendReminder()}
              >
                {t('line.sendReminder')}
              </Button>
            </Stack>
            {config.status !== 'CONNECTED' ? (
              <Alert tone="info">{t('line.reminderNeedConnect')}</Alert>
            ) : null}
            {reminderResult ? (
              <Alert tone="success">
                {t('line.reminderSent')}: {reminderResult}
              </Alert>
            ) : null}
          </>
        )}
      </Section>
    </Page>
  );
}
