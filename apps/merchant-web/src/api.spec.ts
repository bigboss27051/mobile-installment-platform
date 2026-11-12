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
});
