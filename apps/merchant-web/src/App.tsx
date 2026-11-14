import { FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  apiRequest,
  getAccessToken,
  login,
  setAccessToken,
  withIdempotency,
} from './api';
import { LanguageSwitch, useI18n } from './i18n-context';

type Page =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'applications'
  | 'contracts'
  | 'enroll';

type TenantMe = {
  name: string;
  slug: string;
  branches: { id: string; code: string; name: string }[];
};

const PAGES: Page[] = [
  'products',
  'inventory',
  'customers',
  'applications',
  'contracts',
  'enroll',
];

export function App() {
  const { t, apiError } = useI18n();
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [page, setPage] = useState<Page>('contracts');
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <LoginForm
        onLoggedIn={(accessToken) => {
          setAccessToken(accessToken);
          setToken(accessToken);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <nav>
        <strong>{t('nav.brand')}</strong>
        <LanguageSwitch />
        {PAGES.map((item) => (
          <button key={item} onClick={() => setPage(item)}>
            {t(`nav.${item}`)}
          </button>
        ))}
        <button
          onClick={() => {
            setAccessToken(null);
            setToken(null);
          }}
        >
          {t('nav.logout')}
        </button>
      </nav>
      <main>
        {error ? <p className="error">{error}</p> : null}
        {page === 'products' ? <ProductsPage onError={setError} apiError={apiError} /> : null}
        {page === 'inventory' ? <InventoryPage onError={setError} apiError={apiError} /> : null}
        {page === 'customers' ? <CustomersPage onError={setError} apiError={apiError} /> : null}
        {page === 'applications' ? (
          <ApplicationsPage onError={setError} apiError={apiError} />
        ) : null}
        {page === 'contracts' ? <ContractsPage onError={setError} apiError={apiError} /> : null}
        {page === 'enroll' ? <EnrollPage onError={setError} apiError={apiError} /> : null}
      </main>
    </div>
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const { t, apiError } = useI18n();
  const [email, setEmail] = useState('owner@example.com');
  const [password, setPassword] = useState('Password1!');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await login(email, password);
      onLoggedIn(result.accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? apiError(err.message) : t('login.failed'));
    }
  }

  return (
    <main>
      <div className="card login-card">
        <LanguageSwitch />
        <h1>{t('login.title')}</h1>
        <form onSubmit={onSubmit}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.email')}
            aria-label={t('login.email')}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password')}
            aria-label={t('login.password')}
          />
          <button className="primary" type="submit">
            {t('login.submit')}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}

function ProductsPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: string; name: string; brand: string }[]>([]);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');

  async function refresh() {
    try {
      setRows(await apiRequest('/api/v1/products'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('products.loadFailed'));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>{t('products.title')}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/products', {
            method: 'POST',
            body: JSON.stringify({ name, brand }),
          });
          await refresh();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('products.name')}
          aria-label={t('products.name')}
        />
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder={t('products.brand')}
          aria-label={t('products.brand')}
        />
        <button className="primary">{t('products.create')}</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>{t('products.colName')}</th>
            <th>{t('products.colBrand')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.brand}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: string; imei: string; status: string }[]>([]);
  const [imei, setImei] = useState('');
  const [variantId, setVariantId] = useState('');
  const [branchId, setBranchId] = useState('');

  async function refresh() {
    try {
      const [imeis, me] = await Promise.all([
        apiRequest<{ id: string; imei: string; status: string }[]>('/api/v1/inventory/imeis'),
        apiRequest<TenantMe>('/api/v1/tenants/me'),
      ]);
      setRows(imeis);
      if (!branchId && me.branches[0]) {
        setBranchId(me.branches[0].id);
      }
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('inventory.loadFailed'));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>{t('inventory.title')}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/inventory/imeis/receive', {
            method: 'POST',
            body: JSON.stringify({
              branchId,
              variantId,
              imei,
              reason: t('inventory.receiveReason'),
            }),
          });
          await refresh();
        }}
      >
        <input
          placeholder={t('inventory.variantId')}
          aria-label={t('inventory.variantId')}
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        />
        <input
          placeholder={t('inventory.imei')}
          aria-label={t('inventory.imei')}
          value={imei}
          onChange={(e) => setImei(e.target.value)}
        />
        <button className="primary">{t('inventory.receive')}</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>{t('inventory.colImei')}</th>
            <th>{t('inventory.colStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.imei}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<
    { id: string; fullName: string; phone: string; nationalIdMasked: string }[]
  >([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');

  async function refresh() {
    try {
      setRows(await apiRequest('/api/v1/customers'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('customers.loadFailed'));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>{t('customers.title')}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/customers', {
            method: 'POST',
            body: JSON.stringify({ fullName, phone, nationalId }),
          });
          await refresh();
        }}
      >
        <input
          placeholder={t('customers.fullName')}
          aria-label={t('customers.fullName')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          placeholder={t('customers.phone')}
          aria-label={t('customers.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          placeholder={t('customers.nationalId')}
          aria-label={t('customers.nationalId')}
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
        />
        <button className="primary">{t('customers.create')}</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>{t('customers.colName')}</th>
            <th>{t('customers.colPhone')}</th>
            <th>{t('customers.colNationalId')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.fullName}</td>
              <td>{row.phone}</td>
              <td>{row.nationalIdMasked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationsPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: string; status: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [imeiUnitId, setImeiUnitId] = useState('');
  const [planId, setPlanId] = useState('');
  const [principal, setPrincipal] = useState('12000.00');
  const [downPayment, setDownPayment] = useState('2000.00');

  async function refresh() {
    try {
      const [apps, plans] = await Promise.all([
        apiRequest<{ id: string; status: string }[]>('/api/v1/applications'),
        apiRequest<{ id: string; code: string }[]>('/api/v1/installment-plans'),
      ]);
      setRows(apps);
      if (!planId && plans[0]) {
        setPlanId(plans[0].id);
      }
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('applications.loadFailed'));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>{t('applications.title')}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/applications', {
            method: 'POST',
            body: JSON.stringify({
              customerId,
              imeiUnitId,
              planId,
              principal,
              downPayment,
            }),
          });
          await refresh();
        }}
      >
        <input
          placeholder={t('applications.customerId')}
          aria-label={t('applications.customerId')}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <input
          placeholder={t('applications.imeiUnitId')}
          aria-label={t('applications.imeiUnitId')}
          value={imeiUnitId}
          onChange={(e) => setImeiUnitId(e.target.value)}
        />
        <input
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          placeholder={t('applications.principal')}
          aria-label={t('applications.principal')}
        />
        <input
          value={downPayment}
          onChange={(e) => setDownPayment(e.target.value)}
          placeholder={t('applications.downPayment')}
          aria-label={t('applications.downPayment')}
        />
        <button className="primary">{t('applications.create')}</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>{t('applications.colId')}</th>
            <th>{t('applications.colStatus')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.status}</td>
              <td>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/v1/applications/${row.id}/submit`, {
                      method: 'POST',
                    });
                    await refresh();
                  }}
                >
                  {t('applications.submit')}
                </button>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/v1/applications/${row.id}/decision`, {
                      method: 'POST',
                      body: JSON.stringify({
                        decision: 'APPROVE',
                        reason: t('applications.approveReason'),
                      }),
                    });
                    await refresh();
                  }}
                >
                  {t('applications.approve')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: string; status: string }[]>([]);
  const [applicationId, setApplicationId] = useState('');
  const [selected, setSelected] = useState<{
    id: string;
    status: string;
    scheduleItems: { seq: number; totalDue: string; amountPaid: string; status: string }[];
  } | null>(null);
  const [qr, setQr] = useState<unknown>(null);
  const [amount, setAmount] = useState('100.00');

  async function refresh() {
    try {
      setRows(await apiRequest('/api/v1/contracts'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('contracts.loadFailed'));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>{t('contracts.title')}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest(`/api/v1/applications/${applicationId}/contracts`, {
            method: 'POST',
          });
          await refresh();
        }}
      >
        <input
          placeholder={t('contracts.applicationId')}
          aria-label={t('contracts.applicationId')}
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
        />
        <button className="primary">{t('contracts.create')}</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>{t('contracts.colId')}</th>
            <th>{t('contracts.colStatus')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.status}</td>
              <td>
                <button
                  onClick={async () => {
                    setSelected(await apiRequest(`/api/v1/contracts/${row.id}`));
                  }}
                >
                  {t('contracts.open')}
                </button>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/v1/contracts/${row.id}/activate`, {
                      method: 'POST',
                    });
                    await refresh();
                  }}
                >
                  {t('contracts.activate')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <div className="card">
          <h2>{t('contracts.detailTitle', { id: selected.id })}</h2>
          <p>{t('contracts.status', { status: selected.status })}</p>
          <table>
            <thead>
              <tr>
                <th>{t('contracts.colSeq')}</th>
                <th>{t('contracts.colDue')}</th>
                <th>{t('contracts.colPaid')}</th>
                <th>{t('contracts.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {selected.scheduleItems.map((item) => (
                <tr key={item.seq}>
                  <td>{item.seq}</td>
                  <td>{item.totalDue}</td>
                  <td>{item.amountPaid}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const intent = await apiRequest<{ qrPayload: unknown }>(
                `/api/v1/contracts/${selected.id}/payment-intents`,
                {
                  method: 'POST',
                  headers: { 'Idempotency-Key': crypto.randomUUID() },
                  body: JSON.stringify({ amount }),
                },
              );
              setQr(intent.qrPayload);
            }}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('contracts.amount')}
              aria-label={t('contracts.amount')}
            />
            <button className="primary">{t('contracts.createIntent')}</button>
          </form>
          {qr ? <pre>{JSON.stringify(qr, null, 2)}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}

type EnrollmentSession = {
  id: string;
  status: string;
  platform: string;
  expiresAt: string;
  contractId: string;
};

type EnrollmentQr = {
  format: string;
  payload: Record<string, unknown>;
  payloadFingerprint: string;
  expiresAt: string;
};

function EnrollPage({
  onError,
  apiError,
}: {
  onError: (message: string | null) => void;
  apiError: (message: string) => string;
}) {
  const { t } = useI18n();
  const [contractId, setContractId] = useState('');
  const [platform, setPlatform] = useState<'ANDROID' | 'IOS'>('ANDROID');
  const [session, setSession] = useState<EnrollmentSession | null>(null);
  const [qr, setQr] = useState<EnrollmentQr | null>(null);
  const [iosMessage, setIosMessage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reason, setReason] = useState(() => t('enroll.defaultReason'));

  const qrText = qr ? JSON.stringify(qr.payload) : '';
  const qrHasWifiSecret = /WIFI_PASSWORD/i.test(qrText);

  async function createSession(event: FormEvent) {
    event.preventDefault();
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
      setIosMessage(null);
      setDeviceId(null);
      onError(null);
      if (created.platform === 'ANDROID') {
        const material = await apiRequest<EnrollmentQr>(
          `/api/v1/devices/enrollment-sessions/${created.id}/qr`,
          { method: 'POST' },
        );
        setQr(material);
      } else {
        setIosMessage(t('enroll.iosInstructions'));
      }
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('QR_NOT_APPLICABLE')) {
        setIosMessage(t('enroll.iosInstructions'));
        onError(null);
        return;
      }
      onError(err instanceof ApiError ? apiError(err.message) : t('enroll.failed'));
    }
  }

  return (
    <div>
      <h1>{t('enroll.title')}</h1>
      <div className="card">
        <p>{t('enroll.stubNote')}</p>
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
        <button className="primary">{t('enroll.createSession')}</button>
      </form>
      {session ? (
        <div className="card">
          <p>{t('enroll.sessionId', { id: session.id })}</p>
          <p>{t('enroll.status', { status: session.status })}</p>
          <p>{t('enroll.expires', { at: session.expiresAt })}</p>
        </div>
      ) : null}
      {iosMessage ? <p>{iosMessage}</p> : null}
      {qr ? (
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
      {session ? (
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
    </div>
  );
}
