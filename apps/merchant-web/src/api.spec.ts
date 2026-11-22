import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, apiUpload, login, setAccessToken, subscribeAuthExpired } from './api';

describe('merchant api client', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('sends a Bearer token on authenticated requests', async () => {
    setAccessToken('staff-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: '1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/v1/contracts')).resolves.toEqual({ id: '1' });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer staff-token');
  });

  it('clears the session on 401', async () => {
    setAccessToken('expired');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      }),
    );

    await expect(apiRequest('/api/v1/contracts')).rejects.toMatchObject({
      status: 401,
    });
    expect(localStorage.getItem('mip.staff.accessToken')).toBeNull();
  });

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

  it('sends Idempotency-Key on enrollment session create', async () => {
    setAccessToken('staff-token');
    const { withIdempotency } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'sess-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/v1/devices/enrollment-sessions', {
      ...withIdempotency({
        method: 'POST',
        body: JSON.stringify({ contractId: 'c1', platform: 'ANDROID' }),
      }),
    });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer staff-token');
    expect(headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      contractId: 'c1',
      platform: 'ANDROID',
    });
  });

  it('uploads KYC files without forcing a JSON content type', async () => {
    setAccessToken('staff-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'doc-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.set('type', 'ID_FRONT');
    body.set('file', new File(['png'], 'id.png', { type: 'image/png' }));

    await expect(apiUpload('/api/v1/kyc-cases/case-1/documents', body)).resolves.toEqual({
      id: 'doc-1',
    });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer staff-token');
    expect(headers.get('Content-Type')).toBeNull();
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(body);
  });
});
