import { FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  apiRequest,
  getAccessToken,
  login,
  setAccessToken,
} from './api';
import { DevicesPage } from './devices-page';
import { EnrollPage } from './enroll-page';
import { KycPanel } from './kyc-panel';
import { LineLinkPanel } from './line-link-panel';
import { LineSettingsPage } from './line-settings-page';
import { LanguageSwitch, useI18n } from './i18n-context';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Page,
  Section,
  Select,
  Spinner,
  Table,
} from './ui';

type AppPage =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'applications'
  | 'contracts'
  | 'devices'
  | 'enroll'
  | 'line';

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
  'devices',
  'enroll',
  'line',
];

async function runAction(
  action: () => Promise<void>,
  onError: (message: string | null) => void,
  apiError: (message: string) => string,
  fallback: string,
) {
  try {
    await action();
  } catch (err) {
    onError(err instanceof ApiError ? apiError(err.message) : fallback);
  }
}

export function App() {
  const { t, apiError } = useI18n();
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [page, setPage] = useState<AppPage>('contracts');
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

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
              setError(null);
              setNavOpen(false);
            }}
          >
            {t(`nav.${item}`)}
          </button>
        ))}
        <button type="button" onClick={() => setLogoutOpen(true)}>
          {t('nav.logout')}
        </button>
      </nav>
      <div className="app-main">
        <div className="app-topbar">
          <Button type="button" variant="secondary" onClick={() => setNavOpen(true)}>
            {t('nav.menu')}
          </Button>
        </div>
        {error ? (
          <div className="mip-toast">
            <Alert tone="error">
              <span>{error}</span>
              <button
                type="button"
                className="mip-toast__close"
                aria-label={t('common.dismiss')}
                onClick={() => setError(null)}
              >
                ×
              </button>
            </Alert>
          </div>
        ) : null}
        {logoutOpen ? (
          <ConfirmDialog
            title={t('logout.title')}
            body={t('logout.body')}
            confirmLabel={t('logout.confirm')}
            cancelLabel={t('logout.cancel')}
            onCancel={() => setLogoutOpen(false)}
            onConfirm={() => {
              setLogoutOpen(false);
              setAccessToken(null);
              setToken(null);
            }}
          />
        ) : null}
        {page === 'products' ? <ProductsPage onError={setError} apiError={apiError} /> : null}
        {page === 'inventory' ? <InventoryPage onError={setError} apiError={apiError} /> : null}
        {page === 'customers' ? <CustomersPage onError={setError} apiError={apiError} /> : null}
        {page === 'applications' ? (
          <ApplicationsPage onError={setError} apiError={apiError} />
        ) : null}
        {page === 'contracts' ? <ContractsPage onError={setError} apiError={apiError} /> : null}
        {page === 'devices' ? <DevicesPage onError={setError} apiError={apiError} /> : null}
        {page === 'enroll' ? <EnrollPage onError={setError} apiError={apiError} /> : null}
        {page === 'line' ? <LineSettingsPage onError={setError} apiError={apiError} /> : null}
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
  const [variants, setVariants] = useState<
    { id: string; sku: string; color: string; storage: string; productName: string }[]
  >([]);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [productId, setProductId] = useState('');
  const [sku, setSku] = useState('');
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const products = await apiRequest<{ id: string; name: string; brand: string }[]>(
        '/api/v1/products',
      );
      const listed = (
        await Promise.all(
          products.map(async (product) => {
            const items = await apiRequest<
              { id: string; sku: string; color: string; storage: string }[]
            >(`/api/v1/products/${product.id}/variants`);
            return items.map((item) => ({ ...item, productName: product.name }));
          }),
        )
      ).flat();
      setRows(products);
      setVariants(listed);
      if (!productId && products[0]) {
        setProductId(products[0].id);
      }
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
            try {
              await apiRequest('/api/v1/products', {
                method: 'POST',
                body: JSON.stringify({ name, brand }),
              });
              setName('');
              setBrand('');
              await refresh();
            } catch (err) {
              onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
            }
          }}
        >
          <FormField label={t('products.name')} htmlFor="product-name" required>
            <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={t('products.brand')} htmlFor="product-brand" required>
            <Input id="product-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </FormField>
          <div className="mip-form-actions mip-form-grid__span">
            <Button type="submit" variant="primary">
              {t('products.create')}
            </Button>
          </div>
        </form>
      </Section>
      <Section title={t('products.variantTitle')}>
        <form
          className="mip-form-grid mip-form-grid--2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await apiRequest(`/api/v1/products/${productId}/variants`, {
                method: 'POST',
                body: JSON.stringify({ sku, color, storage, price }),
              });
              setSku('');
              setColor('');
              setStorage('');
              setPrice('');
              await refresh();
            } catch (err) {
              onError(err instanceof ApiError ? apiError(err.message) : t('common.actionFailed'));
            }
          }}
        >
          <FormField label={t('products.colName')} htmlFor="variant-product" required>
            <Select
              id="variant-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('products.sku')} htmlFor="variant-sku" required>
            <Input id="variant-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </FormField>
          <FormField label={t('products.color')} htmlFor="variant-color" required>
            <Input id="variant-color" value={color} onChange={(e) => setColor(e.target.value)} />
          </FormField>
          <FormField label={t('products.storage')} htmlFor="variant-storage" required>
            <Input
              id="variant-storage"
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
            />
          </FormField>
          <FormField label={t('products.price')} htmlFor="variant-price" required>
            <Input id="variant-price" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
          <div className="mip-form-actions mip-form-grid__span">
            <Button type="submit" variant="primary" disabled={!productId}>
              {t('products.variantCreate')}
            </Button>
          </div>
        </form>
        {variants.length === 0 ? (
          <EmptyState>{t('products.variantsEmpty')}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('products.colName')}</th>
                <th>{t('products.sku')}</th>
                <th>{t('products.colVariant')}</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    {variant.productName} {variant.color} {variant.storage}
                  </td>
                  <td>{variant.sku}</td>
                  <td>{variant.id}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
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
  const [rows, setRows] = useState<
    { id: string; imei: string | null; serial: string | null; status: string }[]
  >([]);
  const [variants, setVariants] = useState<{ id: string; label: string }[]>([]);
  const [imei, setImei] = useState('');
  const [serial, setSerial] = useState('');
  const [variantId, setVariantId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [imeis, me, products] = await Promise.all([
        apiRequest<
          { id: string; imei: string | null; serial: string | null; status: string }[]
        >('/api/v1/inventory/imeis'),
        apiRequest<TenantMe>('/api/v1/tenants/me'),
        apiRequest<{ id: string; name: string }[]>('/api/v1/products'),
      ]);
      const listed = (
        await Promise.all(
          products.map(async (product) => {
            const items = await apiRequest<{ id: string; sku: string; color: string }[]>(
              `/api/v1/products/${product.id}/variants`,
            );
            return items.map((item) => ({
              id: item.id,
              label: `${product.name} ${item.sku} ${item.color}`,
            }));
          }),
        )
      ).flat();
      setRows(imeis);
      setVariants(listed);
      if (!variantId && listed[0]) {
        setVariantId(listed[0].id);
      }
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
            if (!imei.trim() && !serial.trim()) {
              onError(t('inventory.identityRequired'));
              return;
            }
            if (!variantId) {
              onError(t('inventory.noVariant'));
              return;
            }
            try {
              await apiRequest('/api/v1/inventory/imeis/receive', {
                method: 'POST',
                body: JSON.stringify({
                  branchId,
                  variantId,
                  ...(imei.trim() ? { imei: imei.trim() } : {}),
                  ...(serial.trim() ? { serial: serial.trim() } : {}),
                  reason: t('inventory.receiveReason'),
                }),
              });
              setVariantId(variants[0]?.id ?? '');
              setImei('');
              setSerial('');
              onError(null);
              await refresh();
            } catch (err) {
              onError(
                err instanceof ApiError ? apiError(err.message) : t('inventory.receiveFailed'),
              );
            }
          }}
        >
          <FormField label={t('inventory.variantId')} htmlFor="inventory-variant" required>
            <Select
              id="inventory-variant"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('inventory.imei')} htmlFor="inventory-imei">
            <Input id="inventory-imei" value={imei} onChange={(e) => setImei(e.target.value)} />
          </FormField>
          <FormField label={t('inventory.serial')} htmlFor="inventory-serial">
            <Input
              id="inventory-serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </FormField>
          <div className="mip-form-actions mip-form-grid__span">
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
                <th>{t('inventory.colSerial')}</th>
                <th>{t('inventory.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.imei ?? '—'}</td>
                  <td>{row.serial ?? '—'}</td>
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
  const [kycCases, setKycCases] = useState<{ customerId: string; status: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(true);

  function latestKyc(customerId: string) {
    return kycCases.find((item) => item.customerId === customerId)?.status ?? 'NONE';
  }

  async function refresh() {
    setLoading(true);
    try {
      const [customers, cases] = await Promise.all([
        apiRequest<{ id: string; fullName: string; phone: string; nationalIdMasked: string }[]>(
          '/api/v1/customers',
        ),
        apiRequest<{ customerId: string; status: string }[]>('/api/v1/kyc-cases'),
      ]);
      setRows(customers);
      setKycCases(cases);
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
            await runAction(
              async () => {
                await apiRequest('/api/v1/customers', {
                  method: 'POST',
                  body: JSON.stringify({ fullName, phone, nationalId }),
                });
                setFullName('');
                setPhone('');
                setNationalId('');
                await refresh();
              },
              onError,
              apiError,
              t('common.actionFailed'),
            );
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
          <div className="mip-form-grid__span">
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
          <div className="mip-form-actions mip-form-grid__span">
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
                <th>{t('customers.colKyc')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.fullName}</td>
                  <td>{row.phone}</td>
                  <td>{row.nationalIdMasked}</td>
                  <td>{t(`kyc.status.${latestKyc(row.id)}`)}</td>
                  <td>
                    <Button type="button" variant="secondary" onClick={() => setSelectedId(row.id)}>
                      {t('kyc.open')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
      {selectedId ? (
        <>
          <KycPanel
            customerId={selectedId}
            customerName={rows.find((row) => row.id === selectedId)?.fullName ?? ''}
            onError={onError}
            apiError={apiError}
            onUpdated={refresh}
          />
          <LineLinkPanel
            customerId={selectedId}
            onError={onError}
            apiError={apiError}
          />
        </>
      ) : null}
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
  const [rows, setRows] = useState<{ id: string; status: string; customerId: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [devices, setDevices] = useState<{ id: string; imei: string | null; serial: string | null }[]>(
    [],
  );
  const [plans, setPlans] = useState<{ id: string; code: string; name: string; termMonths: number }[]>(
    [],
  );
  const [customerId, setCustomerId] = useState('');
  const [imeiUnitId, setImeiUnitId] = useState('');
  const [planId, setPlanId] = useState('');
  const [principal, setPrincipal] = useState('12000.00');
  const [downPayment, setDownPayment] = useState('2000.00');
  const [loading, setLoading] = useState(true);

  function keepOrFirst(current: string, ids: string[]) {
    return ids.includes(current) ? current : (ids[0] ?? '');
  }

  async function refresh() {
    setLoading(true);
    try {
      const [apps, planRows, customerRows, kycCases, stock] = await Promise.all([
        apiRequest<{ id: string; status: string; customerId: string }[]>('/api/v1/applications'),
        apiRequest<{ id: string; code: string; name: string; termMonths: number }[]>(
          '/api/v1/installment-plans',
        ),
        apiRequest<{ id: string; fullName: string; phone: string }[]>('/api/v1/customers'),
        apiRequest<{ customerId: string; status: string }[]>('/api/v1/kyc-cases'),
        apiRequest<{ id: string; imei: string | null; serial: string | null }[]>(
          '/api/v1/inventory/imeis?status=AVAILABLE',
        ),
      ]);
      const approvedCustomerIds = new Set(
        kycCases.filter((item) => item.status === 'APPROVED').map((item) => item.customerId),
      );
      const eligible = customerRows.filter((customer) => approvedCustomerIds.has(customer.id));
      setRows(apps);
      setPlans(planRows);
      setCustomers(eligible);
      setDevices(stock);
      setCustomerId((current) => keepOrFirst(current, eligible.map((customer) => customer.id)));
      setImeiUnitId((current) => keepOrFirst(current, stock.map((device) => device.id)));
      setPlanId((current) => keepOrFirst(current, planRows.map((plan) => plan.id)));
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
            if (!customerId || !imeiUnitId || !planId) {
              onError(t('applications.choose'));
              return;
            }
            await runAction(
              async () => {
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
              },
              onError,
              apiError,
              t('common.actionFailed'),
            );
          }}
        >
          <FormField label={t('applications.customerId')} htmlFor="app-customer" required>
            <Select
              id="app-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.length === 0 ? (
                <option value="">{t('applications.noCustomer')}</option>
              ) : null}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName} · {customer.phone}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('applications.imeiUnitId')} htmlFor="app-imei" required>
            <Select id="app-imei" value={imeiUnitId} onChange={(e) => setImeiUnitId(e.target.value)}>
              {devices.length === 0 ? (
                <option value="">{t('applications.noDevice')}</option>
              ) : null}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.imei || device.serial || device.id}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('applications.plan')} htmlFor="app-plan" required>
            <Select id="app-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.length === 0 ? <option value="">{t('applications.noPlan')}</option> : null}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.code} · {plan.termMonths}
                </option>
              ))}
            </Select>
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
                    <div className="mip-inline-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          await runAction(
                            async () => {
                              await apiRequest(`/api/v1/applications/${row.id}/submit`, {
                                method: 'POST',
                              });
                              await refresh();
                            },
                            onError,
                            apiError,
                            t('common.actionFailed'),
                          );
                        }}
                      >
                        {t('applications.submit')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={async () => {
                          await runAction(
                            async () => {
                              await apiRequest(`/api/v1/applications/${row.id}/decision`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  decision: 'APPROVE',
                                  reason: t('applications.approveReason'),
                                }),
                              });
                              await refresh();
                            },
                            onError,
                            apiError,
                            t('common.actionFailed'),
                          );
                        }}
                      >
                        {t('applications.approve')}
                      </Button>
                    </div>
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
  const [rows, setRows] = useState<{ id: string; status: string; applicationId: string }[]>([]);
  const [approvedApps, setApprovedApps] = useState<{ id: string; customerId: string; status: string }[]>(
    [],
  );
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
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
      const [contracts, applications, customerRows] = await Promise.all([
        apiRequest<{ id: string; status: string; applicationId: string }[]>('/api/v1/contracts'),
        apiRequest<{ id: string; status: string; customerId: string }[]>('/api/v1/applications'),
        apiRequest<{ id: string; fullName: string }[]>('/api/v1/customers'),
      ]);
      setCustomerNames(
        Object.fromEntries(customerRows.map((customer) => [customer.id, customer.fullName])),
      );
      const taken = new Set(
        contracts
          .filter((contract) => contract.status !== 'CANCELLED')
          .map((contract) => contract.applicationId),
      );
      const approved = applications.filter(
        (application) => application.status === 'APPROVED' && !taken.has(application.id),
      );
      setRows(contracts);
      setApprovedApps(approved);
      setApplicationId((current) =>
        approved.some((application) => application.id === current)
          ? current
          : (approved[0]?.id ?? ''),
      );
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
            if (!applicationId) {
              onError(t('contracts.chooseApplication'));
              return;
            }
            await runAction(
              async () => {
                await apiRequest(`/api/v1/applications/${applicationId}/contracts`, {
                  method: 'POST',
                });
                await refresh();
              },
              onError,
              apiError,
              t('common.actionFailed'),
            );
          }}
        >
          <FormField label={t('contracts.applicationId')} htmlFor="contract-app" required>
            <Select
              id="contract-app"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            >
              {approvedApps.length === 0 ? (
                <option value="">{t('contracts.noApproved')}</option>
              ) : null}
              {approvedApps.map((application) => (
                <option key={application.id} value={application.id}>
                  {customerNames[application.customerId] ?? application.id} · {application.status}
                </option>
              ))}
            </Select>
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
                    <div className="mip-inline-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          await runAction(
                            async () => {
                              setSelected(await apiRequest(`/api/v1/contracts/${row.id}`));
                              onError(null);
                            },
                            onError,
                            apiError,
                            t('common.actionFailed'),
                          );
                        }}
                      >
                        {t('contracts.open')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={async () => {
                          await runAction(
                            async () => {
                              await apiRequest(`/api/v1/contracts/${row.id}/activate`, {
                                method: 'POST',
                              });
                              await refresh();
                            },
                            onError,
                            apiError,
                            t('common.actionFailed'),
                          );
                        }}
                      >
                        {t('contracts.activate')}
                      </Button>
                    </div>
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
              await runAction(
                async () => {
                  const intent = await apiRequest<{ qrPayload: unknown }>(
                    `/api/v1/contracts/${selected.id}/payment-intents`,
                    {
                      method: 'POST',
                      headers: { 'Idempotency-Key': crypto.randomUUID() },
                      body: JSON.stringify({ amount }),
                    },
                  );
                  setQr(intent.qrPayload);
                  onError(null);
                },
                onError,
                apiError,
                t('common.actionFailed'),
              );
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
