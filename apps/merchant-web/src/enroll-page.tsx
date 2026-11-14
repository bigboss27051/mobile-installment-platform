import { FormEvent, useState } from 'react';
import { ApiError, apiRequest, withIdempotency } from './api';
import {
  canStaffActivate,
  canStaffCancel,
  isTerminalEnrollment,
  resolveEnrollmentStatus,
  statusTone,
} from './enroll-status';
import { useI18n } from './i18n-context';

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
  const [contractId, setContractId] = useState('');
  const [platform, setPlatform] = useState<'ANDROID' | 'IOS'>('ANDROID');
  const [consent, setConsent] = useState(false);
  const [iosPrereq, setIosPrereq] = useState({
    abm: false,
    mdm: false,
    configurator: false,
    erased: false,
  });
  const [session, setSession] = useState<EnrollmentSession | null>(null);
  const [qr, setQr] = useState<EnrollmentQr | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reason, setReason] = useState(() => t('enroll.defaultReason'));

  const viewStatus = session
    ? resolveEnrollmentStatus(session)
    : null;
  const qrText = qr ? JSON.stringify(qr.payload) : '';
  const qrHasWifiSecret = /WIFI_PASSWORD/i.test(qrText);
  const iosReady = Object.values(iosPrereq).every(Boolean);

  async function loadQr(sessionId: string) {
    const material = await apiRequest<EnrollmentQr>(
      `/api/v1/devices/enrollment-sessions/${sessionId}/qr`,
      { method: 'POST' },
    );
    setQr(material);
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    if (!consent) {
      onError(t('enroll.needConsent'));
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
    <div>
      <h1>{t('enroll.title')}</h1>
      <div className="card">
        <p>{t('enroll.stubNote')}</p>
        <p className="muted">{t('enroll.handoverBlocked')}</p>
      </div>

      <div className="card">
        {platform === 'ANDROID' ? (
          <>
            <h2>{t('enroll.androidHow')}</h2>
            <ol>
              <li>{t('enroll.androidStep1')}</li>
              <li>{t('enroll.androidStep2')}</li>
              <li>{t('enroll.androidStep3')}</li>
              <li>{t('enroll.androidStep4')}</li>
            </ol>
            <p className="error">{t('enroll.playProtect')}</p>
          </>
        ) : (
          <>
            <h2>{t('enroll.iosHow')}</h2>
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
            <p className="error">{t('enroll.iosNoSkip')}</p>
            <p>{t('enroll.iosThirtyDays')}</p>
          </>
        )}
      </div>

      <form onSubmit={createSession}>
        <input
          placeholder={t('enroll.contractId')}
          aria-label={t('enroll.contractId')}
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as 'ANDROID' | 'IOS')}
          aria-label={t('enroll.title')}
        >
          <option value="ANDROID">{t('enroll.android')}</option>
          <option value="IOS">{t('enroll.ios')}</option>
        </select>
        <label className="check-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          {t('enroll.consent')}
        </label>
        <button className="primary">{t('enroll.createSession')}</button>
      </form>

      {session && viewStatus ? (
        <div className="card">
          <p>
            <span className={`chip chip-${statusTone(viewStatus)}`}>
              {t(`enroll.state.${viewStatus}`)}
            </span>
          </p>
          <p>{t('enroll.sessionId', { id: session.id })}</p>
          <p>{t('enroll.expires', { at: session.expiresAt })}</p>
          {session.lastErrorCode ? <p className="error">{session.lastErrorCode}</p> : null}
          <div className="action-row">
            <button type="button" onClick={() => void refreshSession()}>
              {t('enroll.refresh')}
            </button>
            {canStaffCancel(viewStatus) ? (
              <button type="button" onClick={() => void cancelSession()}>
                {t('enroll.cancel')}
              </button>
            ) : null}
            {isTerminalEnrollment(viewStatus) ? (
              <button type="button" onClick={resetWizard}>
                {t('enroll.newSession')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {session?.platform === 'ANDROID' && qr && viewStatus === 'WAITING_FOR_DEVICE' ? (
        <div className="card">
          <p>{qr.format}</p>
          <p>{t('enroll.fingerprint', { hash: qr.payloadFingerprint })}</p>
          {qrHasWifiSecret ? (
            <p className="error">{t('enroll.wifiForbidden')}</p>
          ) : (
            <pre>{JSON.stringify(qr.payload, null, 2)}</pre>
          )}
        </div>
      ) : null}

      {session && viewStatus && canStaffActivate(viewStatus) ? (
        <form
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
          <input
            placeholder={t('enroll.reason')}
            aria-label={t('enroll.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="primary">{t('enroll.activateBind')}</button>
          {deviceId ? <p>{t('enroll.bound', { id: deviceId })}</p> : null}
        </form>
      ) : null}

      {viewStatus === 'COMPLETED' ? <p>{t('enroll.handoverReady')}</p> : null}
    </div>
  );
}
