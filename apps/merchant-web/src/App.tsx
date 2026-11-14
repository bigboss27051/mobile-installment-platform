import { FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  apiRequest,
  getAccessToken,
  login,
  setAccessToken,
} from './api';
import { EnrollPage } from './enroll-page';
import { LanguageSwitch, useI18n } from './i18n-context';
import {
  Alert,
  Button,
  EmptyState,
  FormField,
  Input,
  Page,
  Section,
  Spinner,
  Table,
} from './ui';

type AppPage =
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

const PAGES: AppPage[] = [
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
  const [page, setPage] = useState<AppPage>('contracts');
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      {navOpen ? (
        <button
          type="button"
          className="app-backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <nav className="app-sidebar" aria-label="Main">
        <div className="app-sidebar__brand">{t('nav.brand')}</div>
        <LanguageSwitch />
        {PAGES.map((item) => (
          <button
            key={item}
            type="button"
            className={page === item ? 'active' : undefined}
            onClick={() => {
              setPage(item);
              setNavOpen(false);
            }}
          >
            {t(`nav.${item}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setAccessToken(null);
            setToken(null);
          }}
        >
          {t('nav.logout')}
        </button>
      </nav>
      <div className="app-main">
        <div className="app-topbar">
          <Button type="button" variant="secondary" onClick={() => setNavOpen(true)}>
            {t('nav.menu')}
          </Button>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {page === 'products' ? <ProductsPage onError={setError} apiError={apiError} /> : null}
        {page === 'inventory' ? <InventoryPage onError={setError} apiError={apiError} /> : null}
        {page === 'customers' ? <CustomersPage onError={setError} apiError={apiError} /> : null}
        {page === 'applications' ? (
          <ApplicationsPage onError={setError} apiError={apiError} />
        ) : null}
        {page === 'contracts' ? <ContractsPage onError={setError} apiError={apiError} /> : null}
        {page === 'enroll' ? <EnrollPage onError={setError} apiError={apiError} /> : null}
      </div>
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
    <div className="login-screen">
      <div className="login-card">
        <LanguageSwitch />
        <h1>{t('login.title')}</h1>
        <form className="mip-form-grid" onSubmit={onSubmit}>
          <FormField label={t('login.email')} htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </FormField>
          <FormField label={t('login.password')} htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>
          <div className="mip-form-actions">
            <Button type="submit" variant="primary">
              {t('login.submit')}
            </Button>
          </div>
        </form>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    </div>
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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await apiRequest('/api/v1/products'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page title={t('products.title')}>
      <Section title={t('products.new')}>
        <form
          className="mip-form-grid mip-form-grid--2"
          onSubmit={async (event) => {
            event.preventDefault();
            await apiRequest('/api/v1/products', {
              method: 'POST',
              body: JSON.stringify({ name, brand }),
            });
            setName('');
            setBrand('');
            await refresh();
          }}
        >
          <FormField label={t('products.name')} htmlFor="product-name" required>
            <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={t('products.brand')} htmlFor="product-brand" required>
            <Input id="product-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </FormField>
          <div className="mip-form-actions" style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary">
              {t('products.create')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('products.title')}>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('products.empty')}</EmptyState>
        ) : (
          <Table>
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
          </Table>
        )}
      </Section>
    </Page>
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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page title={t('inventory.title')}>
      <Section title={t('inventory.new')}>
        <form
          className="mip-form-grid mip-form-grid--2"
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
            setVariantId('');
            setImei('');
            await refresh();
          }}
        >
          <FormField label={t('inventory.variantId')} htmlFor="inventory-variant" required>
            <Input
              id="inventory-variant"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            />
          </FormField>
          <FormField label={t('inventory.imei')} htmlFor="inventory-imei" required>
            <Input id="inventory-imei" value={imei} onChange={(e) => setImei(e.target.value)} />
          </FormField>
          <div className="mip-form-actions" style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary">
              {t('inventory.receive')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('inventory.title')}>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('inventory.empty')}</EmptyState>
        ) : (
          <Table>
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
          </Table>
        )}
      </Section>
    </Page>
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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await apiRequest('/api/v1/customers'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('customers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page title={t('customers.title')}>
      <Section title={t('customers.new')}>
        <form
          className="mip-form-grid mip-form-grid--2"
          onSubmit={async (event) => {
            event.preventDefault();
            await apiRequest('/api/v1/customers', {
              method: 'POST',
              body: JSON.stringify({ fullName, phone, nationalId }),
            });
            setFullName('');
            setPhone('');
            setNationalId('');
            await refresh();
          }}
        >
          <FormField label={t('customers.fullName')} htmlFor="customer-name" required>
            <Input
              id="customer-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>
          <FormField label={t('customers.phone')} htmlFor="customer-phone" required>
            <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField
              label={t('customers.nationalId')}
              htmlFor="customer-nid"
              required
              helperText={t('customers.nationalIdHelper')}
            >
              <Input
                id="customer-nid"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </FormField>
          </div>
          <div className="mip-form-actions" style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary">
              {t('customers.create')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('customers.title')}>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('customers.empty')}</EmptyState>
        ) : (
          <Table>
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
          </Table>
        )}
      </Section>
    </Page>
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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page title={t('applications.title')}>
      <Section title={t('applications.new')}>
        <form
          className="mip-form-grid"
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
          <FormField label={t('applications.customerId')} htmlFor="app-customer" required>
            <Input
              id="app-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </FormField>
          <FormField label={t('applications.imeiUnitId')} htmlFor="app-imei" required>
            <Input
              id="app-imei"
              value={imeiUnitId}
              onChange={(e) => setImeiUnitId(e.target.value)}
            />
          </FormField>
          <div className="mip-form-grid mip-form-grid--2">
            <FormField label={t('applications.principal')} htmlFor="app-principal" required>
              <Input
                id="app-principal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </FormField>
            <FormField label={t('applications.downPayment')} htmlFor="app-down" required>
              <Input
                id="app-down"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
              />
            </FormField>
          </div>
          <div className="mip-form-actions">
            <Button type="submit" variant="primary">
              {t('applications.create')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('applications.title')}>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('applications.empty')}</EmptyState>
        ) : (
          <Table>
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        await apiRequest(`/api/v1/applications/${row.id}/submit`, {
                          method: 'POST',
                        });
                        await refresh();
                      }}
                    >
                      {t('applications.submit')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await apiRequest('/api/v1/contracts'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? apiError(err.message) : t('contracts.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page title={t('contracts.title')}>
      <Section title={t('contracts.new')}>
        <form
          className="mip-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await apiRequest(`/api/v1/applications/${applicationId}/contracts`, {
              method: 'POST',
            });
            await refresh();
          }}
        >
          <FormField label={t('contracts.applicationId')} htmlFor="contract-app" required>
            <Input
              id="contract-app"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            />
          </FormField>
          <div className="mip-form-actions">
            <Button type="submit" variant="primary">
              {t('contracts.create')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('contracts.list')}>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>{t('contracts.empty')}</EmptyState>
        ) : (
          <Table>
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        setSelected(await apiRequest(`/api/v1/contracts/${row.id}`));
                      }}
                    >
                      {t('contracts.open')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={async () => {
                        await apiRequest(`/api/v1/contracts/${row.id}/activate`, {
                          method: 'POST',
                        });
                        await refresh();
                      }}
                    >
                      {t('contracts.activate')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
      {selected ? (
        <Section title={t('contracts.detailTitle', { id: selected.id })}>
          <p>{t('contracts.status', { status: selected.status })}</p>
          <Table>
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
          </Table>
          <form
            className="mip-form-grid"
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
            <FormField label={t('contracts.amount')} htmlFor="pay-amount" required>
              <Input
                id="pay-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <div className="mip-form-actions">
              <Button type="submit" variant="primary">
                {t('contracts.createIntent')}
              </Button>
            </div>
          </form>
          {qr ? <pre className="mip-pre">{JSON.stringify(qr, null, 2)}</pre> : null}
        </Section>
      ) : null}
    </Page>
  );
}
