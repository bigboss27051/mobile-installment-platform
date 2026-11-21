import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest, withIdempotency } from './api';
import {
  canIssueEnrollmentQr,
  canStaffActivate,
  canStaffCancel,
  isAndroidFrpChecklistComplete,
  isTerminalEnrollment,
  resolveEnrollmentStatus,
  showsAndroidQr,
  statusTone,
} from './enroll-status';
import { useI18n } from './i18n-context';
import { Alert, Button, FormField, Input, Page, Section, Select } from './ui';

type EnrollmentSession = {
  id: string;
  status: string;
  platform: string;
  expiresAt: string;
  contractId: string;
  lastErrorCode?: string | null;
};

type EnrollmentQr = {
  format: string;
  payload: Record<string, unknown>;
  payloadFingerprint: string;
  expiresAt: string;
};

export function EnrollPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [contracts, setContracts] = useState<{ id: string; principal: string; termMonths: number }[]>(
    [],
  );
  const [contractsLoaded, setContractsLoaded] = useState(false);
  const [contractId, setContractId] = useState('');
  const [platform, setPlatform] = useState<'ANDROID' | 'IOS'>('ANDROID');
  const [consent, setConsent] = useState(false);
  const [iosPrereq, setIosPrereq] = useState({
    abm: false,
    mdm: false,
    configurator: false,
    erased: false,
  });
  const [frpChecklist, setFrpChecklist] = useState({
    frpClearedOrNotApplicable: false,
    newQrAfterWipe: false,
    noRemoteFrpBypass: false,
  });
  const [session, setSession] = useState<EnrollmentSession | null>(null);
  const [qr, setQr] = useState<EnrollmentQr | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reason, setReason] = useState(() => t('enroll.defaultReason'));

  useEffect(() => {
    void (async () => {
      try {
        const rows = await apiRequest<
          { id: string; status: string; principal: string; termMonths: number }[]
        >('/api/v1/contracts');
        const active = rows.filter((row) => row.status === 'ACTIVE');
        setContracts(active);
        setContractId((current) =>
          active.some((row) => row.id === current) ? current : (active[0]?.id ?? ''),
        );
        onError(null);
      } catch (err) {
        onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
      } finally {
        setContractsLoaded(true);
      }
    })();
  }, []);

  const viewStatus = session
    ? resolveEnrollmentStatus(session)
    : null;
  const qrText = qr ? JSON.stringify(qr.payload) : '';
  const qrHasWifiSecret = /WIFI_PASSWORD/i.test(qrText);
  const iosReady = Object.values(iosPrereq).every(Boolean);
  const frpReady = isAndroidFrpChecklistComplete(frpChecklist);

  async function loadQr(sessionId: string) {
    if (!isAndroidFrpChecklistComplete(frpChecklist)) {
      onError(t('enroll.needFrp'));
      return;
    }
    try {
      const material = await apiRequest<EnrollmentQr>(
        `/api/v1/devices/enrollment-sessions/${sessionId}/qr`,
        { method: 'POST' },
      );
      setQr(material);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
    }
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    if (!contractId) {
      onError(t('enroll.noContract'));
      return;
    }
    if (!consent) {
      onError(t('enroll.needConsent'));
      return;
    }
    if (platform === 'ANDROID' && !frpReady) {
      onError(t('enroll.needFrp'));
      return;
    }
    if (platform === 'IOS' && !iosReady) {
      onError(t('enroll.needIosPrereq'));
      return;
    }
    try {
      const created = await apiRequest<EnrollmentSession>(
        '/api/v1/devices/enrollment-sessions',
        withIdempotency({
          method: 'POST',
          body: JSON.stringify({ contractId, platform }),
        }),
      );
      setSession(created);
      setQr(null);
      setDeviceId(null);
      onError(null);
      if (created.platform === 'ANDROID') {
        await loadQr(created.id);
      }
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
    }
  }

  async function refreshSession() {
    if (!session) {
      return;
    }
    try {
      const latest = await apiRequest<EnrollmentSession>(
        `/api/v1/devices/enrollment-sessions/${session.id}`,
      );
      setSession(latest);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
    }
  }

  async function cancelSession() {
    if (!session) {
      return;
    }
    try {
      const cancelled = await apiRequest<EnrollmentSession>(
        `/api/v1/devices/enrollment-sessions/${session.id}/cancel`,
        { method: 'POST' },
      );
      setSession(cancelled);
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
    }
  }

  function resetWizard() {
    setSession(null);
    setQr(null);
    setDeviceId(null);
    onError(null);
  }

  return (
    <Page title={t('enroll.title')}>
      <Section>
        <p>{t('enroll.stubNote')}</p>
        <Alert tone="info">{t('enroll.handoverBlocked')}</Alert>
      </Section>

      <Section title={platform === 'ANDROID' ? t('enroll.androidHow') : t('enroll.iosHow')}>
        {platform === 'ANDROID' ? (
          <>
            <ol>
              <li>{t('enroll.androidStep1')}</li>
              <li>{t('enroll.androidStep2')}</li>
              <li>{t('enroll.androidStep3')}</li>
              <li>{t('enroll.androidStep4')}</li>
              <li>{t('enroll.androidStep5')}</li>
            </ol>
            <Alert tone="error">{t('enroll.playProtect')}</Alert>
            <Alert tone="info">{t('enroll.frpBlocked')}</Alert>
            <p>{t('enroll.frpTitle')}</p>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="enroll-frp-cleared"
                checked={frpChecklist.frpClearedOrNotApplicable}
                onChange={(e) =>
                  setFrpChecklist({
                    ...frpChecklist,
                    frpClearedOrNotApplicable: e.target.checked,
                  })
                }
              />
              {t('enroll.frpCleared')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="enroll-frp-new-qr"
                checked={frpChecklist.newQrAfterWipe}
                onChange={(e) =>
                  setFrpChecklist({ ...frpChecklist, newQrAfterWipe: e.target.checked })
                }
              />
              {t('enroll.frpNewQr')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="enroll-frp-no-bypass"
                checked={frpChecklist.noRemoteFrpBypass}
                onChange={(e) =>
                  setFrpChecklist({ ...frpChecklist, noRemoteFrpBypass: e.target.checked })
                }
              />
              {t('enroll.frpNoBypass')}
            </label>
          </>
        ) : (
          <>
            <p>{t('enroll.iosPrereqTitle')}</p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={iosPrereq.abm}
                onChange={(e) => setIosPrereq({ ...iosPrereq, abm: e.target.checked })}
              />
              {t('enroll.iosPrereqAbm')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={iosPrereq.mdm}
                onChange={(e) => setIosPrereq({ ...iosPrereq, mdm: e.target.checked })}
              />
              {t('enroll.iosPrereqMdm')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={iosPrereq.configurator}
                onChange={(e) =>
                  setIosPrereq({ ...iosPrereq, configurator: e.target.checked })
                }
              />
              {t('enroll.iosPrereqConfigurator')}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={iosPrereq.erased}
                onChange={(e) => setIosPrereq({ ...iosPrereq, erased: e.target.checked })}
              />
              {t('enroll.iosPrereqErased')}
            </label>
            <ol>
              <li>{t('enroll.iosStep1')}</li>
              <li>{t('enroll.iosStep2')}</li>
              <li>{t('enroll.iosStep3')}</li>
              <li>{t('enroll.iosStep4')}</li>
              <li>{t('enroll.iosStep5')}</li>
            </ol>
            <Alert tone="error">{t('enroll.iosNoSkip')}</Alert>
            <p>{t('enroll.iosThirtyDays')}</p>
          </>
        )}
      </Section>

      <Section>
        <form className="mip-form-grid mip-form-grid--2" onSubmit={createSession}>
          <FormField label={t('enroll.contractId')} htmlFor="enroll-contract-id" required>
            <Select
              id="enroll-contract-id"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            >
              {contracts.length === 0 ? (
                <option value="">{contractsLoaded ? t('enroll.noContract') : ''}</option>
              ) : null}
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.principal} · {contract.termMonths}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={`${t('enroll.android')} / ${t('enroll.ios')}`}
            htmlFor="enroll-platform"
          >
            <Select
              id="enroll-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'ANDROID' | 'IOS')}
            >
              <option value="ANDROID">{t('enroll.android')}</option>
              <option value="IOS">{t('enroll.ios')}</option>
            </Select>
          </FormField>
          <div className="mip-form-grid__span">
            <label className="check-row">
              <input
                type="checkbox"
                data-testid="enroll-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t('enroll.consent')}
            </label>
          </div>
          <div className="mip-form-actions mip-form-grid__span">
            <Button type="submit" variant="primary">
              {t('enroll.createSession')}
            </Button>
          </div>
        </form>
      </Section>

      {session && viewStatus ? (
        <Section>
          <p>
            <span className={`chip chip-${statusTone(viewStatus)}`}>
              {t(`enroll.state.${viewStatus}`)}
            </span>
          </p>
          <p>{t('enroll.sessionId', { id: session.id })}</p>
          <p>{t('enroll.expires', { at: session.expiresAt })}</p>
          {session.lastErrorCode ? (
            <Alert tone="error">{session.lastErrorCode}</Alert>
          ) : null}
          <div className="mip-form-actions">
            <Button type="button" variant="secondary" onClick={() => void refreshSession()}>
              {t('enroll.refresh')}
            </Button>
            {canIssueEnrollmentQr(session.platform, viewStatus, qr !== null) ? (
              <Button
                type="button"
                variant="primary"
                disabled={session.platform === 'ANDROID' && !frpReady}
                onClick={() => void loadQr(session.id)}
              >
                {t('enroll.issueQr')}
              </Button>
            ) : null}
            {canStaffCancel(viewStatus) ? (
              <Button type="button" variant="danger" onClick={() => void cancelSession()}>
                {t('enroll.cancel')}
              </Button>
            ) : null}
            {isTerminalEnrollment(viewStatus) ? (
              <Button type="button" variant="secondary" onClick={resetWizard}>
                {t('enroll.newSession')}
              </Button>
            ) : null}
          </div>
        </Section>
      ) : null}

      {session?.platform === 'ANDROID' && qr && viewStatus && showsAndroidQr(viewStatus) ? (
        <Section>
          <p>{qr.format}</p>
          <p>{t('enroll.fingerprint', { hash: qr.payloadFingerprint })}</p>
          {qrHasWifiSecret ? (
            <Alert tone="error">{t('enroll.wifiForbidden')}</Alert>
          ) : (
            <pre className="mip-pre">{JSON.stringify(qr.payload, null, 2)}</pre>
          )}
        </Section>
      ) : null}

      {session && viewStatus && canStaffActivate(viewStatus) ? (
        <Section>
          <form
            className="mip-form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                const activation = await apiRequest<{ deviceId: string }>(
                  '/api/v1/devices/activate',
                  withIdempotency({
                    method: 'POST',
                    body: JSON.stringify({
                      enrollmentSessionId: session.id,
                      contractId: session.contractId || contractId,
                      reason,
                    }),
                  }),
                );
                setDeviceId(activation.deviceId);
                await apiRequest(`/api/v1/devices/${activation.deviceId}/bind-contract`, {
                  ...withIdempotency({
                    method: 'POST',
                    body: JSON.stringify({
                      contractId: session.contractId || contractId,
                      reason,
                    }),
                  }),
                });
                const latest = await apiRequest<EnrollmentSession>(
                  `/api/v1/devices/enrollment-sessions/${session.id}`,
                );
                setSession(latest);
                onError(null);
              } catch (err) {
                onError(err instanceof ApiError ? apiError(err.message) : t('enroll.bindFailed'));
              }
            }}
          >
            <FormField label={t('enroll.reason')} htmlFor="enroll-reason" required>
              <Input
                id="enroll-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
            <div className="mip-form-actions">
              <Button type="submit" variant="primary">
                {t('enroll.activateBind')}
              </Button>
            </div>
            {deviceId ? <p>{t('enroll.bound', { id: deviceId })}</p> : null}
          </form>
        </Section>
      ) : null}

      {viewStatus === 'COMPLETED' ? (
        <Alert tone="success">{t('enroll.handoverReady')}</Alert>
      ) : null}
    </Page>
  );
}
