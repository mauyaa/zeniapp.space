import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './client';

describe('API availability failure contract', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects an HTML wake-up response as service starting instead of parsing it as data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><body>SERVICE WAKING UP</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )
    );

    await expect(request('/listings/wake-up')).rejects.toMatchObject({
      code: 'SERVICE_STARTING',
      status: 503,
    });
  });

  it('maps request timeout to a safe user-facing API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
    );

    const result = request('/listings/timeout', { timeoutMs: 1 });
    await expect(result).rejects.toMatchObject({ code: 'TIMEOUT', status: 408 });
  });

  it('does not automatically replay a failed payment mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Try later' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      request('/pay/transactions/initiate', { method: 'POST', body: '{}' })
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
