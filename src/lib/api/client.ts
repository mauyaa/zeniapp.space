/**
 * Core API client — shared request infrastructure, token management, and error handling.
 * All domain-specific API modules import from here.
 */

import { ApiError } from '../../types/api';
import type { Role } from '../../types/api';
import { apiUrl } from '../runtime';

// ---------- Token helpers ----------

export function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem('refresh_token');
  } catch {
    return null;
  }
}

export function setTokens(token?: string | null, refreshToken?: string | null): void {
  try {
    if (token) localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  } catch {
    // Quota exceeded or blocked — ignore gracefully
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
  } catch {
    // ignore
  }
}

// ---------- Abort / deduplication ----------

const inflightRequests = new Map<string, Promise<unknown>>();

function dedupeKey(path: string, method: string): string | null {
  // Only deduplicate GET requests
  if (method !== 'GET') return null;
  return `${method}:${path}`;
}

// ---------- Configuration ----------

/** Default request timeout in milliseconds (15 seconds) */
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRY_AFTER_MS = 8_000;

// ---------- Core request ----------

export async function request<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const key = dedupeKey(path, method);

  // Deduplicate identical concurrent GET requests
  if (key && inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  const { timeoutMs, ...fetchOptions } = options;
  const promise = _doRequest<T>(path, fetchOptions, timeoutMs);

  if (key) {
    inflightRequests.set(key, promise);
    promise.finally(() => inflightRequests.delete(key));
  }

  return promise;
}

async function _doRequest<T>(
  path: string,
  options: RequestInit & { signal?: AbortSignal } = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const token = getToken();
  const requestMethod = (options.method || 'GET').toUpperCase();
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + '-web';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Merge caller signal with timeout signal so both can abort
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const combinedSignal = options.signal
    ? combineAbortSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  const doFetch = async (attempt: number): Promise<Response> => {
    try {
      const res = await fetch(apiUrl(path), {
        ...options,
        signal: combinedSignal,
        credentials: 'include',
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      // Handle 429 Too Many Requests with Retry-After backoff
      // Restrict auto-retry to idempotent reads to avoid hanging user actions
      // (e.g. login POST) when servers return long Retry-After windows.
      if (res.status === 429 && attempt < 3 && requestMethod === 'GET') {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = parseRetryAfterMs(retryAfter, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        return doFetch(attempt + 1);
      }

      // Retry on gateway/timeouts
      if (!res.ok && attempt < 2 && [502, 503, 504].includes(res.status)) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        return doFetch(attempt + 1);
      }
      // Attempt refresh once on 401 (except auth endpoints to avoid loops)
      if (res.status === 401 && attempt === 0 && !path.startsWith('/auth/')) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return doFetch(attempt + 1);
        }
      }
      return res;
    } catch (e) {
      // Distinguish timeout aborts from user-initiated aborts
      if (e instanceof DOMException && e.name === 'AbortError') {
        if (timeoutController.signal.aborted && !options.signal?.aborted) {
          throw new ApiError(`Request to ${path} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
        }
        throw e; // user-initiated abort — re-throw as-is
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        return doFetch(attempt + 1);
      }
      throw e;
    }
  };

  let res: Response;
  try {
    res = await doFetch(0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let message = '';
    let code: string | undefined;
    if (contentType.includes('application/json')) {
      try {
        const data = (await res.json()) as { message?: string; code?: string };
        message = data?.message ? String(data.message) : JSON.stringify(data);
        code = data?.code;
      } catch {
        // ignore and fall back to text
      }
    }
    if (!message) {
      try {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text) as { message?: string; code?: string };
            message = data?.message ? String(data.message) : text;
            code = data?.code;
          } catch {
            message = text;
          }
        }
      } catch {
        // ignore
      }
    }
    throw new ApiError(message || `Request failed: ${res.status}`, res.status, code);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

function parseRetryAfterMs(retryAfter: string | null, attempt: number): number {
  const fallbackMs = Math.min(1000 * Math.pow(2, attempt), MAX_RETRY_AFTER_MS);
  if (!retryAfter) return fallbackMs;

  // Retry-After can be delta-seconds or an HTTP-date.
  const seconds = parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const asDate = Date.parse(retryAfter);
  if (!Number.isNaN(asDate)) {
    return Math.min(Math.max(0, asDate - Date.now()), MAX_RETRY_AFTER_MS);
  }

  return fallbackMs;
}

// ---------- Abort signal helpers ----------

/** Combine two AbortSignals so either one can cancel the request */
function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  // Use AbortSignal.any if available (modern browsers)
  if ('any' in AbortSignal) {
    return (AbortSignal as unknown as { any(signals: AbortSignal[]): AbortSignal }).any([a, b]);
  }
  // Fallback: create a controller that aborts when either signal fires
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}

// ---------- Session refresh ----------

async function refreshSession(): Promise<boolean> {
  // If a logout was initiated in this tab (or another), do not auto-refresh
  try {
    if (sessionStorage.getItem('logout_marker') === '1') {
      clearTokens();
      return false;
    }
  } catch {
    // sessionStorage blocked
  }

  try {
    const refreshToken = getRefreshToken();
    const res = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: refreshToken ? { 'x-refresh-token': refreshToken } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = (await res.json()) as {
      token: string;
      refreshToken?: string;
      user?: { id: string; name: string; role: Role };
    };
    if (data.token) setTokens(data.token, data.refreshToken || refreshToken);
    if (data.user) {
      try {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } catch {
        // ignore
      }
    }
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ---------- Abort helpers ----------

/**
 * Create an AbortController that auto-cancels requests when a component unmounts.
 * Usage in hooks:
 *   const controller = createRequestController();
 *   request('/foo', { signal: controller.signal });
 *   return () => controller.abort(); // cleanup
 */
export function createRequestController(): AbortController {
  return new AbortController();
}

/**
 * Custom hook helper: wraps a fetch call with AbortController.
 * Returns the promise and an abort function.
 */
export function abortableRequest<T>(
  path: string,
  options: RequestInit = {}
): { promise: Promise<T>; abort: () => void } {
  const controller = new AbortController();
  const promise = request<T>(path, { ...options, signal: controller.signal });
  return { promise, abort: () => controller.abort() };
}

// ---------- Helpers ----------

/** Build query string from params object, skipping undefined/null/empty values */
export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (k === 'verifiedOnly' && v === true) {
      query.set(k, 'true');
      return;
    }
    if (v === false) return;
    query.set(k, String(v));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}
