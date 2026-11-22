import { FormEvent, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ApiError,
  apiRequest,
  getAccessToken,
  login,
  setAccessToken,
  subscribeAuthExpired,
} from './api';
import { DevicesPage } from './devices-page';
import { EnrollPage } from './enroll-page';
import { KycPanel } from './kyc-panel';
import { LineLinkPanel } from './line-link-panel';
import { LineSettingsPage } from './line-settings-page';
import { PolicyPage } from './policy-page';
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
import { MIP_TOKENS } from './ui/theme';

type AppPage =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'applications'
  | 'contracts'
  | 'devices'
  | 'policy'
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
  'policy',
  'enroll',
  'line',
];

const DRAWER_WIDTH = 220;

const drawerPaperSx = {
  width: DRAWER_WIDTH,
  boxSizing: 'border-box',
  bgcolor: MIP_TOKENS.sidebar,
  color: '#fff',
  border: 'none',
} as const;

function navButtonSx(active: boolean) {
  return {
    display: 'block',
    width: '100%',
    m: 0,
    px: 1.5,
    py: 1,
    minHeight: MIP_TOKENS.inputHeight,
    border: 0,
    borderRadius: 1,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: '#fff',
    bgcolor: active ? 'primary.main' : 'transparent',
  } as const;
}

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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [page, setPage] = useState<AppPage>('contracts');
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    return subscribeAuthExpired(() => {
      setToken(null);
      setSessionExpired(true);
      setError(null);
      setLogoutOpen(false);
    });
  }, []);

  if (!token) {
    return (
      <LoginForm
        sessionExpired={sessionExpired}
        onLoggedIn={(accessToken) => {
          setAccessToken(accessToken);
          setToken(accessToken);
          setSessionExpired(false);
        }}
      />
    );
  }

  function renderSidebar() {
    return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        height: '100%',
        '& .lang-switch button': {
          color: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.35)',
          backgroundColor: 'transparent',
        },
        '& .lang-switch button.active': {
          color: '#fff',
          bgcolor: 'primary.main',
          borderColor: 'primary.main',
        },
      }}
    >
      <Box sx={{ fontWeight: 700, mb: 1.5 }}>{t('nav.brand')}</Box>
      <LanguageSwitch />
      {PAGES.map((item) => (
        <Box
          component="button"
          key={item}
          type="button"
          onClick={() => {
            setPage(item);
            setError(null);
            setNavOpen(false);
          }}
          sx={navButtonSx(page === item)}
        >
          {t(`nav.${item}`)}
        </Box>
      ))}
      <Box component="button" type="button" onClick={() => setLogoutOpen(true)} sx={navButtonSx(false)}>
        {t('nav.logout')}
      </Box>
    </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="temporary"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        {renderSidebar()}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        elevation={0}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        {renderSidebar()}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', mb: 2 }}>
          <Button type="button" variant="ghost" onClick={() => setNavOpen(true)}>
            {t('nav.menu')}
          </Button>
        </Box>
        {error ? (
          <Box
            sx={{
              position: 'fixed',
              zIndex: 30,
              top: 2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(480px, calc(100% - 32px))',
              '& .MuiAlert-root': {
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
              },
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1.5,
                width: '100%',
              },
            }}
          >
            <Alert tone="error">
              <span>{error}</span>
              <Box
                component="button"
                type="button"
                aria-label={t('common.dismiss')}
                onClick={() => setError(null)}
                sx={{
                  flex: 'none',
                  m: 0,
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  color: 'inherit',
                  font: 'inherit',
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                ×
              </Box>
            </Alert>
          </Box>
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
        {page === 'policy' ? <PolicyPage onError={setError} apiError={apiError} /> : null}
        {page === 'enroll' ? <EnrollPage onError={setError} apiError={apiError} /> : null}
        {page === 'line' ? <LineSettingsPage onError={setError} apiError={apiError} /> : null}
      </Box>
    </Box>
  );
}

function LoginForm({
  onLoggedIn,
  sessionExpired = false,
}: {
  onLoggedIn: (token: string) => void;
  sessionExpired?: boolean;
}) {
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 3 },
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: MIP_TOKENS.loginMax, p: 3 }}>
        <LanguageSwitch />
        <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
          {t('login.title')}
        </Typography>
        {sessionExpired ? <Alert tone="error">{t('login.sessionExpired')}</Alert> : null}
        <Stack component="form" spacing={2} sx={{ maxWidth: MIP_TOKENS.formMax }} onSubmit={onSubmit}>
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="primary">
              {t('login.submit')}
            </Button>
          </Stack>
        </Stack>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Paper>
    </Box>
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
        <Box
          component="form"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            maxWidth: MIP_TOKENS.formMax,
          }}
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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ mt: 2, gridColumn: '1 / -1' }}
          >
            <Button type="submit" variant="primary">
              {t('products.create')}
            </Button>
          </Stack>
        </Box>
      </Section>
      <Section title={t('products.variantTitle')}>
        <Box
          component="form"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            maxWidth: MIP_TOKENS.formMax,
          }}
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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ mt: 2, gridColumn: '1 / -1' }}
          >
            <Button type="submit" variant="primary" disabled={!productId}>
              {t('products.variantCreate')}
            </Button>
          </Stack>
        </Box>
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
        <Box
          component="form"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            maxWidth: MIP_TOKENS.formMax,
          }}
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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ mt: 2, gridColumn: '1 / -1' }}
          >
            <Button type="submit" variant="primary">
              {t('inventory.receive')}
            </Button>
          </Stack>
        </Box>
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
        <Box
          component="form"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            maxWidth: MIP_TOKENS.formMax,
          }}
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
          <Box sx={{ gridColumn: '1 / -1' }}>
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
          </Box>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ mt: 2, gridColumn: '1 / -1' }}
          >
            <Button type="submit" variant="primary">
              {t('customers.create')}
            </Button>
          </Stack>
        </Box>
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
        <Stack
          component="form"
          spacing={2}
          sx={{ maxWidth: MIP_TOKENS.formMax }}
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              maxWidth: MIP_TOKENS.formMax,
            }}
          >
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
          </Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="primary">
              {t('applications.create')}
            </Button>
          </Stack>
        </Stack>
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
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
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
                    </Stack>
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
        <Stack
          component="form"
          spacing={2}
          sx={{ maxWidth: MIP_TOKENS.formMax }}
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="primary">
              {t('contracts.create')}
            </Button>
          </Stack>
        </Stack>
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
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
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
                    </Stack>
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
          <Stack
            component="form"
            spacing={2}
            sx={{ maxWidth: MIP_TOKENS.formMax }}
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
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="primary">
                {t('contracts.createIntent')}
              </Button>
            </Stack>
          </Stack>
          {qr ? <pre className="mip-pre">{JSON.stringify(qr, null, 2)}</pre> : null}
        </Section>
      ) : null}
    </Page>
  );
}
