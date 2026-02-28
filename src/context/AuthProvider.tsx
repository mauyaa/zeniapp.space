/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

export type Role = 'user' | 'agent' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  availability?: 'active' | 'paused';
  agentVerification?: string;
  mfaEnabled?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  loading: boolean;
  isAuthed: boolean;
  /** Minutes remaining before session expires, null if no token */
  sessionExpiresIn: number | null;
  login: (emailOrPhone: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  register: (form: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => void;
  /** Clear local session only (no redirect, no API). Use when requiring fresh login from landing to prevent using another user's session. */
  clearLocalSession: () => void;
  setUserState: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Safely read from localStorage (handles incognito / quota / blocked scenarios)
  const safeGetItem = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const safeSetItem = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore quota/blocked */ }
  };
  const safeRemoveItem = (key: string) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  };

  // Check if a JWT is expired (with 60s buffer)
  const isTokenExpired = (jwt: string): boolean => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now() + 60_000; // expired or expiring within 60s
    } catch {
      return true; // malformed token → treat as expired
    }
  };

  // Synchronous init from localStorage — eliminates the "Checking session..." flash.
  // Previously loading=true + useEffect meant one render cycle showed a loading screen.
  const initAuth = (): { user: AuthUser | null; token: string | null; refresh: string | null } => {
    const storedToken = safeGetItem('token');
    const storedRefresh = safeGetItem('refresh_token');
    const storedUser = safeGetItem('auth_user');
    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        safeRemoveItem('auth_user');
        safeRemoveItem('token');
        safeRemoveItem('refresh_token');
        return { user: null, token: null, refresh: null };
      }
      try {
        return { user: JSON.parse(storedUser), token: storedToken, refresh: storedRefresh };
      } catch {
        safeRemoveItem('auth_user');
        safeRemoveItem('token');
        safeRemoveItem('refresh_token');
      }
    }
    return { user: null, token: null, refresh: null };
  };

  const initial = initAuth();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refresh);
  // Start as false — auth state is resolved synchronously from localStorage
  const [loading, setLoading] = useState(false);
  const [sessionExpiresIn, setSessionExpiresIn] = useState<number | null>(null);

  // Session timeout warning — check token expiry every 30 seconds
  useEffect(() => {
    if (!token) {
      setSessionExpiresIn(null);
      return;
    }

    const checkExpiry = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) { setSessionExpiresIn(null); return; }
        const msRemaining = payload.exp * 1000 - Date.now();
        const minutesRemaining = Math.max(0, Math.ceil(msRemaining / 60_000));
        setSessionExpiresIn(minutesRemaining);
      } catch {
        setSessionExpiresIn(null);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30_000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (emailOrPhone: string, password: string) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.login(emailOrPhone, password);
      setUser(res.user);
      setToken(res.token);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      safeSetItem('auth_user', JSON.stringify(res.user));
      safeSetItem('token', res.token);
      if (res.refreshToken) safeSetItem('refresh_token', res.refreshToken);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.loginWithGoogle(credential);
      setUser(res.user);
      setToken(res.token);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      safeSetItem('auth_user', JSON.stringify(res.user));
      safeSetItem('token', res.token);
      if (res.refreshToken) safeSetItem('refresh_token', res.refreshToken);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (form: Record<string, unknown>) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.register(form);
      setUser(res.user);
      setToken(res.token);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      safeSetItem('auth_user', JSON.stringify(res.user));
      safeSetItem('token', res.token);
      if (res.refreshToken) safeSetItem('refresh_token', res.refreshToken);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Fire-and-forget backend logout; never block UI on this
    api.logout().catch(() => undefined);
    disconnectSocket();
    sessionStorage.setItem('logout_marker', '1');
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    safeRemoveItem('auth_user');
    safeRemoveItem('token');
    safeRemoveItem('refresh_token');
    try { sessionStorage.clear(); } catch { /* ignore */ }
    // Hard redirect ensures every tab resets auth state and protected routes re-check
    window.location.replace('/login');
  };

  /** Clear session in memory and storage only (no redirect). Used when user must re-enter credentials (e.g. from landing page). */
  const clearLocalSession = () => {
    disconnectSocket();
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    safeRemoveItem('auth_user');
    safeRemoveItem('token');
    safeRemoveItem('refresh_token');
    try { sessionStorage.removeItem('logout_marker'); } catch { /* ignore */ }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      refreshToken,
      role: user?.role ?? null,
      loading,
      isAuthed: Boolean(user && token),
      sessionExpiresIn,
      login,
      loginWithGoogle,
      register,
      logout,
      clearLocalSession,
      setUserState: setUser
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auth methods are stable refs
    [user, token, refreshToken, loading, sessionExpiresIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
