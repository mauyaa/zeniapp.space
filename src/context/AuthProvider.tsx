/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  clearStoredAuthSession,
  getStoredAuthUser,
  getStoredRefreshToken,
  getStoredToken,
  persistAuthSession,
} from '../lib/authStorage';
import { disconnectSocket } from '../lib/socket';

export type Role = 'user' | 'agent' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  availability?: 'active' | 'paused';
  agentVerification?: string;
  mfaEnabled?: boolean;
  avatarUrl?: string;
}

type AuthActionOptions = {
  rememberMe?: boolean;
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  loading: boolean;
  isAuthed: boolean;
  /** Minutes remaining before session expires, null if no token */
  sessionExpiresIn: number | null;
  login: (emailOrPhone: string, password: string, options?: AuthActionOptions) => Promise<AuthUser>;
  loginWithGoogle: (credential: string, options?: AuthActionOptions) => Promise<AuthUser>;
  register: (form: Record<string, unknown>, options?: AuthActionOptions) => Promise<AuthUser>;
  logout: () => void;
  /** Clear local session only (no redirect, no API). */
  clearLocalSession: () => void;
  setUserState: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isTokenExpired = (jwt: string): boolean => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1])) as { exp?: number };
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now() + 60_000;
    } catch {
      return true;
    }
  };

  const initAuth = (): { user: AuthUser | null; token: string | null; refresh: string | null } => {
    const storedToken = getStoredToken();
    const storedRefresh = getStoredRefreshToken();
    const storedUser = getStoredAuthUser();

    if (!storedToken || !storedUser) {
      if (storedToken || storedRefresh) clearStoredAuthSession();
      return { user: null, token: null, refresh: null };
    }

    if (isTokenExpired(storedToken)) {
      clearStoredAuthSession();
      return { user: null, token: null, refresh: null };
    }

    return { user: storedUser, token: storedToken, refresh: storedRefresh };
  };

  const initial = initAuth();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refresh);
  const [loading, setLoading] = useState(false);
  const [sessionExpiresIn, setSessionExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      setSessionExpiresIn(null);
      return;
    }

    const checkExpiry = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
        if (!payload.exp) {
          setSessionExpiresIn(null);
          return;
        }
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

  const login = async (emailOrPhone: string, password: string, options: AuthActionOptions = {}) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.login(emailOrPhone, password);
      setUser(res.user);
      setToken(res.token);
      setRefreshToken(res.refreshToken ?? null);
      persistAuthSession(
        {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        },
        options.rememberMe ?? true
      );
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, options: AuthActionOptions = {}) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.loginWithGoogle(credential);
      setUser(res.user);
      setToken(res.token);
      setRefreshToken(res.refreshToken ?? null);
      persistAuthSession(
        {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        },
        options.rememberMe ?? true
      );
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (form: Record<string, unknown>, options: AuthActionOptions = {}) => {
    setLoading(true);
    try {
      sessionStorage.removeItem('logout_marker');
      const res = await api.register(form);
      setUser(res.user);
      setToken(res.token);
      setRefreshToken(res.refreshToken ?? null);
      persistAuthSession(
        {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        },
        options.rememberMe ?? true
      );
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout().catch(() => undefined);
    disconnectSocket();
    sessionStorage.setItem('logout_marker', '1');
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    clearStoredAuthSession();
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.replace('/login');
  };

  const clearLocalSession = () => {
    disconnectSocket();
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    clearStoredAuthSession();
    try {
      sessionStorage.removeItem('logout_marker');
    } catch {
      /* ignore */
    }
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
      setUserState: setUser,
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
