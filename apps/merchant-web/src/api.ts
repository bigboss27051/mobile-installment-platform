const TOKEN_KEY = 'mip.staff.accessToken';

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
    setAccessToken(null);
    throw new ApiError('Unauthorized', 401);
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
    setAccessToken(null);
    throw new ApiError('Unauthorized', 401);
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
