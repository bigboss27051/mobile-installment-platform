import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest, getAccessToken, login, setAccessToken } from './api';

type Page =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'applications'
  | 'contracts';

type TenantMe = {
  name: string;
  slug: string;
  branches: { id: string; code: string; name: string }[];
};

export function App() {
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
        <strong>Merchant</strong>
        {(['products', 'inventory', 'customers', 'applications', 'contracts'] as Page[]).map(
          (item) => (
            <button key={item} onClick={() => setPage(item)}>
              {item}
            </button>
          ),
        )}
        <button
          onClick={() => {
            setAccessToken(null);
            setToken(null);
          }}
        >
          logout
        </button>
      </nav>
      <main>
        {error ? <p className="error">{error}</p> : null}
        {page === 'products' ? <ProductsPage onError={setError} /> : null}
        {page === 'inventory' ? <InventoryPage onError={setError} /> : null}
        {page === 'customers' ? <CustomersPage onError={setError} /> : null}
        {page === 'applications' ? <ApplicationsPage onError={setError} /> : null}
        {page === 'contracts' ? <ContractsPage onError={setError} /> : null}
      </main>
    </div>
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [email, setEmail] = useState('owner@example.com');
  const [password, setPassword] = useState('Password1!');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await login(email, password);
      onLoggedIn(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <main>
      <div className="card">
        <h1>Merchant login</h1>
        <form onSubmit={onSubmit}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="primary" type="submit">
            Sign in
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}

function ProductsPage({ onError }: { onError: (message: string | null) => void }) {
  const [rows, setRows] = useState<{ id: string; name: string; brand: string }[]>([]);
  const [name, setName] = useState('Phone');
  const [brand, setBrand] = useState('Brand');

  async function refresh() {
    try {
      setRows(await apiRequest('/api/v1/products'));
      onError(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to load products');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>Products</h1>
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
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        <button className="primary">Create product</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Brand</th>
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

function InventoryPage({ onError }: { onError: (message: string | null) => void }) {
  const [rows, setRows] = useState<{ id: string; imei: string; status: string }[]>([]);
  const [imei, setImei] = useState('123456789012345');
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
      onError(err instanceof ApiError ? err.message : 'Failed to load inventory');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>Inventory</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/inventory/imeis/receive', {
            method: 'POST',
            body: JSON.stringify({
              branchId,
              variantId,
              imei,
              reason: 'Merchant web receive',
            }),
          });
          await refresh();
        }}
      >
        <input
          placeholder="variant id"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        />
        <input value={imei} onChange={(e) => setImei(e.target.value)} />
        <button className="primary">Receive IMEI</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>IMEI</th>
            <th>Status</th>
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

function CustomersPage({ onError }: { onError: (message: string | null) => void }) {
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
      onError(err instanceof ApiError ? err.message : 'Failed to load customers');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>Customers</h1>
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
          placeholder="full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input placeholder="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          placeholder="national id"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
        />
        <button className="primary">Create customer</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>National ID</th>
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

function ApplicationsPage({ onError }: { onError: (message: string | null) => void }) {
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
      onError(err instanceof ApiError ? err.message : 'Failed to load applications');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>Applications</h1>
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
          placeholder="customer id"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <input
          placeholder="imei unit id"
          value={imeiUnitId}
          onChange={(e) => setImeiUnitId(e.target.value)}
        />
        <input value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        <input value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
        <button className="primary">Create draft</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
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
                  submit
                </button>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/v1/applications/${row.id}/decision`, {
                      method: 'POST',
                      body: JSON.stringify({
                        decision: 'APPROVE',
                        reason: 'Approved from merchant web',
                      }),
                    });
                    await refresh();
                  }}
                >
                  approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsPage({ onError }: { onError: (message: string | null) => void }) {
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
      onError(err instanceof ApiError ? err.message : 'Failed to load contracts');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <h1>Contracts</h1>
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
          placeholder="approved application id"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
        />
        <button className="primary">Create draft contract</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
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
                  open
                </button>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/v1/contracts/${row.id}/activate`, {
                      method: 'POST',
                    });
                    await refresh();
                  }}
                >
                  activate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <div className="card">
          <h2>Contract {selected.id}</h2>
          <p>Status {selected.status}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Status</th>
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
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="primary">Create PromptPay intent</button>
          </form>
          {qr ? <pre>{JSON.stringify(qr, null, 2)}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}
