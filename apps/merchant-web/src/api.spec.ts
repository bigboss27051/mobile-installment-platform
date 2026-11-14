import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, setAccessToken } from './api';

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
});
