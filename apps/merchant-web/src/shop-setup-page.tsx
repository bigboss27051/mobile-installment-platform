import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { formatBangkokDateTime } from './format-bangkok-datetime';
import { useI18n } from './i18n-context';
import Stack from '@mui/material/Stack';
import { Alert, Button, Page, Section, Spinner } from './ui';
import { MIP_STACK } from './ui/theme';

type ShopSetup = {
  dpcAttested: boolean;
  googleAccountReady: boolean;
  wipeNeedsOnDeviceUnlock: boolean;
  noRemoteFrpBypass: boolean;
  ready: boolean;
  completedAt: string | null;
};

const EMPTY: Omit<ShopSetup, 'ready' | 'completedAt'> = {
  dpcAttested: false,
  googleAccountReady: false,
  wipeNeedsOnDeviceUnlock: false,
  noRemoteFrpBypass: false,
};

export function ShopSetupPage({
  onError,
  apiError,
  onOpenEnroll,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
  onOpenEnroll: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [fields, setFields] = useState(EMPTY);

  function apply(row: ShopSetup | null) {
    if (!row) {
      setFields(EMPTY);
      setReady(false);
      setCompletedAt(null);
      setEditing(false);
      return;
    }
    setFields({
      dpcAttested: row.dpcAttested,
      googleAccountReady: row.googleAccountReady,
      wipeNeedsOnDeviceUnlock: row.wipeNeedsOnDeviceUnlock,
      noRemoteFrpBypass: row.noRemoteFrpBypass,
    });
    setReady(row.ready);
    setCompletedAt(row.completedAt);
    setEditing(false);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const row = await apiRequest<ShopSetup | null>('/api/v1/devices/shop-setup');
        apply(row && typeof row.ready === 'boolean' ? row : null);
        onError(null);
      } catch (err) {
        onError(
          err instanceof ApiError ? apiError(err.message) : t('shopSetup.loadFailed'),
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const allChecked = Object.values(fields).every(Boolean);
  const saveDisabled = saving || (!editing && !allChecked);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (saveDisabled) return;
    setSaving(true);
    onError(null);
    try {
      const updated = await apiRequest<ShopSetup>('/api/v1/devices/shop-setup', {
        method: 'PUT',
        body: JSON.stringify(fields),
      });
      apply(updated);
    } catch (err) {
      onError(
        err instanceof ApiError ? apiError(err.message) : t('shopSetup.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page title={t('shopSetup.title')}>
        <Spinner />
      </Page>
    );
  }

  const savedAt = formatBangkokDateTime(completedAt);

  return (
    <Page title={t('shopSetup.title')}>
      {ready && !editing ? (
        <Section>
          <Alert tone="info">{t('shopSetup.ready')}</Alert>
          {savedAt ? <p>{t('shopSetup.completedAt', { at: savedAt })}</p> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={MIP_STACK.actions} flexWrap="wrap">
            <Button type="button" variant="primary" onClick={onOpenEnroll}>
              {t('shopSetup.goEnroll')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              {t('shopSetup.edit')}
            </Button>
          </Stack>
        </Section>
      ) : (
        <Section>
          <Alert tone="info">{t('shopSetup.blocked')}</Alert>
          <Stack component="form" spacing={MIP_STACK.form} onSubmit={onSave}>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="shop-setup-dpc"
                checked={fields.dpcAttested}
                onChange={(e) =>
                  setFields({ ...fields, dpcAttested: e.target.checked })
                }
              />
              {t('shopSetup.dpc')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="shop-setup-google"
                checked={fields.googleAccountReady}
                onChange={(e) =>
                  setFields({ ...fields, googleAccountReady: e.target.checked })
                }
              />
              {t('shopSetup.google')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="shop-setup-wipe"
                checked={fields.wipeNeedsOnDeviceUnlock}
                onChange={(e) =>
                  setFields({ ...fields, wipeNeedsOnDeviceUnlock: e.target.checked })
                }
              />
              {t('shopSetup.wipe')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="shop-setup-bypass"
                checked={fields.noRemoteFrpBypass}
                onChange={(e) =>
                  setFields({ ...fields, noRemoteFrpBypass: e.target.checked })
                }
              />
              {t('shopSetup.noBypass')}
            </label>
            <Button type="submit" variant="primary" disabled={saveDisabled}>
              {t('shopSetup.save')}
            </Button>
          </Stack>
        </Section>
      )}
    </Page>
  );
}
