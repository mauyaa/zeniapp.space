import { Capacitor } from '@capacitor/core';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const ABSOLUTE_HTTP_URL_RE = /^https?:\/\//i;

const normalizeApiBase = (value: string) => {
  const trimmed = trimTrailingSlash(value.trim());
  if (!trimmed) return '/api';
  if (ABSOLUTE_HTTP_URL_RE.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}`;
};

const isNative = Capacitor.isNativePlatform();

const rawApiBase =
  (isNative
    ? (import.meta.env.VITE_MOBILE_API_BASE_URL as string | undefined) ||
      (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : (import.meta.env.VITE_API_BASE_URL as string | undefined)) || '/api';
export const API_BASE = normalizeApiBase(rawApiBase);

const rawSocketUrl = (
  isNative
    ? (import.meta.env.VITE_MOBILE_SOCKET_URL as string | undefined) ||
      (import.meta.env.VITE_SOCKET_URL as string | undefined)
    : (import.meta.env.VITE_SOCKET_URL as string | undefined)
)?.trim();
export const SOCKET_URL = rawSocketUrl ? trimTrailingSlash(rawSocketUrl) : undefined;

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const apiUrl = (path: string) => `${API_BASE}${normalizePath(path)}`;
export const payApiUrl = (path: string) => `${API_BASE}/pay${normalizePath(path)}`;

function apiOrigin(): string | null {
  if (!ABSOLUTE_HTTP_URL_RE.test(API_BASE)) return null;
  try {
    return new URL(API_BASE).origin;
  } catch {
    return null;
  }
}

/**
 * Resolves backend-provided media URLs so relative paths (for example `/uploads/...`)
 * work in both same-origin and cross-origin deployments.
 */
export function resolveApiAssetUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  const url = rawUrl.trim();
  if (!url) return undefined;
  if (
    ABSOLUTE_HTTP_URL_RE.test(url) ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  ) {
    return url;
  }
  if (url.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${protocol}${url}`;
  }
  const origin = apiOrigin();
  if (!origin) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${normalizedPath}`;
}
