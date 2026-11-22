import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { useI18n } from './i18n-context';
import { Alert, Button, FormField, Input, Page, Section, Spinner } from './ui';

type LineConfig = {
  status: string;
  channelId: string | null;
  maskedSecret: string | null;
  lastWebhookAt: string | null;
  lastError: string | null;
};

export function LineSettingsPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [config, setConfig] = useState<LineConfig | null>(null);
  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await apiRequest<LineConfig>('/api/v1/line/config');
      setConfig(data);
      setChannelId(data.channelId ?? '');
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
          {t('line.status')}: <strong>{config.status}</strong>
        </p>
        <p>
          {t('line.channelId')}: {config.channelId ?? '—'}
        </p>
        <p>
          {t('line.maskedSecret')}: {config.maskedSecret ?? '—'}
        </p>
        <p>
          {t('line.lastWebhook')}: {config.lastWebhookAt ?? '—'}
        </p>
        {config.lastError ? <Alert tone="error">{config.lastError}</Alert> : null}
        <Alert tone="info">{t('line.sandboxNote')}</Alert>
      </Section>
      <Section title={t('line.connectSection')}>
        <form onSubmit={onSave}>
          <FormField label={t('line.channelId')} htmlFor="line-channel-id" required>
            <Input
              id="line-channel-id"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t('line.channelSecret')} htmlFor="line-channel-secret" required>
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
          <Button type="submit" disabled={saving}>
            {t('line.save')}
          </Button>{' '}
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void onDisconnect()}>
            {t('line.disconnect')}
          </Button>
        </form>
      </Section>
    </Page>
  );
}
