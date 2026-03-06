import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStoredAuthSession,
  getStoredAuthUser,
  getStoredRefreshToken,
  getStoredToken,
  isSessionBackedAuth,
  persistAuthSession,
} from './authStorage';

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores remembered sessions in localStorage', () => {
    persistAuthSession(
      {
        token: 'local-token',
        refreshToken: 'local-refresh',
        user: { id: '1', name: 'User', role: 'user' },
      },
      true
    );

    expect(localStorage.getItem('token')).toBe('local-token');
    expect(localStorage.getItem('refresh_token')).toBe('local-refresh');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(getStoredToken()).toBe('local-token');
    expect(isSessionBackedAuth()).toBe(false);
  });

  it('stores non-remembered sessions in sessionStorage', () => {
    persistAuthSession(
      {
        token: 'session-token',
        refreshToken: 'session-refresh',
        user: { id: '2', name: 'Agent', role: 'agent' },
      },
      false
    );

    expect(sessionStorage.getItem('token')).toBe('session-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('session-refresh');
    expect(localStorage.getItem('token')).toBeNull();
    expect(getStoredToken()).toBe('session-token');
    expect(getStoredRefreshToken()).toBe('session-refresh');
    expect(isSessionBackedAuth()).toBe(true);
  });

  it('prefers session token when both exist', () => {
    localStorage.setItem('token', 'local-token');
    sessionStorage.setItem('token', 'session-token');

    expect(getStoredToken()).toBe('session-token');
  });

  it('returns null for malformed stored auth user', () => {
    localStorage.setItem('auth_user', '{broken-json');
    expect(getStoredAuthUser()).toBeNull();
  });

  it('clears auth data from both storages', () => {
    localStorage.setItem('token', 'local-token');
    sessionStorage.setItem('token', 'session-token');
    localStorage.setItem('auth_user', '{"id":"1"}');

    clearStoredAuthSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });
});
