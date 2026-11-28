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
  if (Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data as T;
  }
  return body as T;
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
