# Merchant Web Session-Expired Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When merchant-web gets a mid-session 401, clear the session, force the login screen, and show a session-expired message.

**Architecture:** `api.ts` already clears `localStorage` on 401. Add a small `subscribeAuthExpired` pub/sub so `App` can set React `token` to `null` immediately. Skip notify on `/api/v1/auth/login` so bad credentials do not look like session expiry. `LoginForm` shows an i18n Alert when redirected due to expiry.

**Tech Stack:** React 18, TypeScript, Vitest, jsdom, existing merchant-web `api.ts` / `App.tsx` / `i18n.ts`.

**Spec:** `docs/superpowers/specs/2026-11-22-merchant-web-session-expired-login-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/merchant-web/src/api.ts` | Token storage, fetch helpers, auth-expired pub/sub + notify on 401 (except login) |
| `apps/merchant-web/src/api.spec.ts` | Unit tests for Bearer header, 401 clear, auth-expired listener, login 401 no-notify |
| `apps/merchant-web/src/App.tsx` | Subscribe to auth-expired; `sessionExpired` state; pass into `LoginForm` |
| `apps/merchant-web/src/App.spec.tsx` | Integration: mid-session 401 → login + session-expired copy |
| `apps/merchant-web/src/i18n.ts` | `login.sessionExpired` TH + EN strings |

---

### Task 1: Auth-expired pub/sub in API client

**Files:**
- Modify: `apps/merchant-web/src/api.ts`
- Test: `apps/merchant-web/src/api.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add to `apps/merchant-web/src/api.spec.ts` (keep existing imports; add `subscribeAuthExpired` and `login` to the import from `./api`):

```ts
  it('notifies auth-expired listeners on 401 for authenticated requests', async () => {
    setAccessToken('expired');
    const listener = vi.fn();
    const unsubscribe = subscribeAuthExpired(listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      }),
    );

    await expect(apiRequest('/api/v1/contracts')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('mip.staff.accessToken')).toBeNull();
    unsubscribe();
  });

  it('does not notify auth-expired on login 401', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuthExpired(listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      }),
    );

    await expect(login('bad@example.com', 'wrong')).rejects.toMatchObject({ status: 401 });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies auth-expired listeners on 401 for uploads', async () => {
    setAccessToken('expired');
    const listener = vi.fn();
    const unsubscribe = subscribeAuthExpired(listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      }),
    );

    await expect(apiUpload('/api/v1/kyc-cases/case-1/documents', new FormData())).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
```

Update the top import line to:

```ts
import { apiRequest, apiUpload, login, setAccessToken, subscribeAuthExpired } from './api';
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/merchant-web && npm test -- src/api.spec.ts
```

Expected: FAIL — `subscribeAuthExpired` is not exported / not a function.

- [ ] **Step 3: Implement pub/sub + notify (skip login path)**

Replace / extend `apps/merchant-web/src/api.ts` so it includes:

```ts
const TOKEN_KEY = 'mip.staff.accessToken';

type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

export function subscribeAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function notifyAuthExpired(): void {
  for (const listener of authExpiredListeners) {
    listener();
  }
}

function handleUnauthorized(path: string): never {
  setAccessToken(null);
  if (!path.includes('/auth/login')) {
    notifyAuthExpired();
  }
  throw new ApiError('Unauthorized', 401);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    handleUnauthorized(path);
  }
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new ApiError(body.error?.message ?? 'Request failed', response.status);
  }
  return (body.data as T) ?? (body as T);
}

export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { method: 'POST', body, headers });
  if (response.status === 401) {
    handleUnauthorized(path);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new ApiError(payload.error?.message ?? 'Request failed', response.status);
  }
  return (payload.data as T) ?? (payload as T);
}

export function login(email: string, password: string) {
  return apiRequest<{ accessToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function withIdempotency(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('Idempotency-Key', crypto.randomUUID());
  return { ...init, headers };
}
```

Note: TypeScript `handleUnauthorized` is typed `never` because it always throws; callers after `if (response.status === 401) { handleUnauthorized(path); }` correctly narrow.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd apps/merchant-web && npm test -- src/api.spec.ts
```

Expected: PASS (all api.spec tests including the three new ones).

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/api.ts apps/merchant-web/src/api.spec.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): notify UI when access token is rejected

EOF
)"
```

Only commit if the user asked for commits in this session; otherwise stop and report the change is ready to commit.

---

### Task 2: i18n session-expired strings

**Files:**
- Modify: `apps/merchant-web/src/i18n.ts`
- Test: reuse App test in Task 3 (string presence); optional tiny assert in existing i18n tests if present

- [ ] **Step 1: Add TH and EN keys next to existing login keys**

In the Thai dictionary (near `'login.failed'`):

```ts
  'login.sessionExpired': 'เซสชันหมดอายุ — กรุณาเข้าสู่ระบบอีกครั้ง',
```

In the English dictionary (near `'login.failed'`):

```ts
  'login.sessionExpired': 'Session expired — please sign in again',
```

- [ ] **Step 2: Commit**

```bash
git add apps/merchant-web/src/i18n.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): add session-expired login copy

EOF
)"
```

Same commit rule as Task 1.

---

### Task 3: App forces login + session-expired Alert

**Files:**
- Modify: `apps/merchant-web/src/App.tsx`
- Test: `apps/merchant-web/src/App.spec.tsx`

- [ ] **Step 1: Write the failing App test**

Append a new `describe` (or `it`) in `apps/merchant-web/src/App.spec.tsx`, reusing the existing helpers (`jsonResponse`, `act`, `createRoot`, `I18nProvider`):

```ts
describe('session expired redirect', () => {
  let root: Root;
  const fetchMock = vi.fn();

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = '';
    localStorage.clear();
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it('shows login with session-expired message after a mid-session 401', async () => {
    localStorage.setItem('mip.staff.accessToken', 'expired-token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(() =>
      jsonResponse(401, { error: { message: 'Unauthorized' } }),
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      );
    });

    // Contracts page load triggers apiRequest → 401 → auth expired
    expect(localStorage.getItem('mip.staff.accessToken')).toBeNull();
    expect(container.textContent).toContain('เข้าสู่ระบบร้านค้า');
    expect(container.textContent).toContain('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบอีกครั้ง');
    expect(container.textContent).not.toContain('ยังไม่มีสัญญา');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd apps/merchant-web && npm test -- src/App.spec.tsx
```

Expected: FAIL — still on authenticated shell and/or missing session-expired text (token cleared in storage but React state still logged in).

- [ ] **Step 3: Wire App + LoginForm**

In `apps/merchant-web/src/App.tsx`:

1. Import `subscribeAuthExpired` from `./api`.
2. In `App`, add state and subscription:

```ts
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [sessionExpired, setSessionExpired] = useState(false);
  // ... existing page/error/nav/logout state ...

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
```

3. Update `LoginForm` signature and UI:

```ts
function LoginForm({
  onLoggedIn,
  sessionExpired = false,
}: {
  onLoggedIn: (token: string) => void;
  sessionExpired?: boolean;
}) {
  const { t, apiError } = useI18n();
  // ... existing email/password/error state and onSubmit ...

  return (
    <div className="login-screen">
      <div className="login-card">
        <LanguageSwitch />
        <h1>{t('login.title')}</h1>
        {sessionExpired ? <Alert tone="error">{t('login.sessionExpired')}</Alert> : null}
        <form className="mip-form-grid" onSubmit={onSubmit}>
          {/* unchanged fields */}
        </form>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    </div>
  );
}
```

Keep manual logout as today (`setAccessToken(null); setToken(null);`) — do **not** set `sessionExpired` on manual logout.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd apps/merchant-web && npm test -- src/App.spec.tsx src/api.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

Run:

```bash
cd apps/merchant-web && npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/merchant-web/src/App.spec.tsx apps/merchant-web/src/i18n.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): redirect to login when session expires

EOF
)"
```

If Task 2 was not committed separately, include `i18n.ts` here. Same user-commit rule.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Clear session on mid-session 401 | Task 1 (`handleUnauthorized`) |
| Notify UI / leave shell | Task 1 + Task 3 (`subscribeAuthExpired`) |
| Login + session-expired Alert TH/EN | Task 2 + Task 3 |
| Clear message after successful login | Task 3 (`setSessionExpired(false)`) |
| Login 401 does not show session-expired | Task 1 (skip notify on login) |
| Manual logout no session-expired | Task 3 (logout path unchanged) |
| Tests for API + App | Task 1 + Task 3 |
| Out of scope (refresh, JWT exp, router) | Not planned |

No placeholders. Signatures consistent: `subscribeAuthExpired`, `login.sessionExpired`, `sessionExpired` prop.
