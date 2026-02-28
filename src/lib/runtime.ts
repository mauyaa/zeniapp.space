import { Capacitor } from '@capacitor/core';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeApiBase = (value: string) => {
  const trimmed = trimTrailingSlash(value.trim());
  if (!trimmed) return '/api';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}`;
};

const isNative = Capacitor.isNativePlatform();

const rawApiBase =
  (isNative
    ? (import.meta.env.VITE_MOBILE_API_BASE_URL as string | undefined) || (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : (import.meta.env.VITE_API_BASE_URL as string | undefined)) || '/api';
export const API_BASE = normalizeApiBase(rawApiBase);

const rawSocketUrl = (
  isNative
    ? (import.meta.env.VITE_MOBILE_SOCKET_URL as string | undefined) || (import.meta.env.VITE_SOCKET_URL as string | undefined)
    : (import.meta.env.VITE_SOCKET_URL as string | undefined)
)?.trim();
export const SOCKET_URL = rawSocketUrl ? trimTrailingSlash(rawSocketUrl) : undefined;

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const apiUrl = (path: string) => `${API_BASE}${normalizePath(path)}`;
export const payApiUrl = (path: string) => `${API_BASE}/pay${normalizePath(path)}`;
