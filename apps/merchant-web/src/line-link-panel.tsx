import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { ApiError, apiRequest } from './api';
import { useI18n } from './i18n-context';
import { Alert, Button, Section, Spinner } from './ui';

type LinkStatus = {
  customerId: string;
  linked: boolean;
  lineUserIdMasked: string | null;
  displayName: string | null;
  linkedAt: string | null;
};

type Invite = {
  customerId: string;
  token: string;
  expiresAt: string;
  instruction: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LineLinkPanel({
  customerId,
  onError,
  apiError,
}: {
  customerId: string;
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      const data = await apiRequest<LinkStatus>(
        `/api/v1/line/customers/${customerId}/link`,
      );
      setStatus(data);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.linkLoadFailed'));
    }
  }

  useEffect(() => {
    setInvite(null);
    setCopied(false);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function createInvite() {
    setBusy(true);
    setCopied(false);
    try {
      const data = await apiRequest<Invite>(
        `/api/v1/line/customers/${customerId}/link-invites`,
        { method: 'POST', body: '{}' },
      );
      setInvite(data);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.inviteFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await apiRequest(`/api/v1/line/customers/${customerId}/unlink`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'merchant_web_unlink' }),
      });
      setInvite(null);
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('line.unlinkFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteMessage() {
    if (!invite) return;
    const message = `LINK ${invite.token}`;
    const ok = await copyText(message);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      onError(t('line.copyFailed'));
    }
  }

  return (
    <Section title={t('line.linkSection')}>
      {!status ? (
        <Spinner />
      ) : (
        <>
          <p>{t('line.linkHelp')}</p>
          <p>
            {t('line.linkStatus')}:{' '}
            <strong>{status.linked ? t('line.linked') : t('line.unlinked')}</strong>
          </p>
          {status.linked ? (
            <p>
              {t('line.lineUser')}: {status.lineUserIdMasked}
              {status.displayName ? ` (${status.displayName})` : ''}
            </p>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="button" disabled={busy} onClick={() => void createInvite()}>
              {t('line.createInvite')}
            </Button>
            {status.linked ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void unlink()}
              >
                {t('line.unlink')}
              </Button>
            ) : null}
          </Stack>
          {invite ? (
            <Alert tone="info">
              <p>{t('line.inviteExplain')}</p>
              <p>
                <code>LINK {invite.token}</code>
              </p>
              <p>
                {t('line.tokenExpires')}: {new Date(invite.expiresAt).toLocaleString()}
              </p>
              <Button type="button" variant="secondary" onClick={() => void copyInviteMessage()}>
                {copied ? t('line.copied') : t('line.copyLinkCommand')}
              </Button>
            </Alert>
          ) : null}
        </>
      )}
    </Section>
  );
}
