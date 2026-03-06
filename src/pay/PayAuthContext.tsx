/* eslint-disable react-refresh/only-export-components */
/**
 * PayAuthContext — Intentionally separate from the main AuthProvider.
 *
 * The Pay portal is a security-isolated sub-application.  It maintains its
 * own auth state, token storage, and session lifecycle so that:
 *
 *   1. A compromised main-app session cannot automatically access payment
 *      operations (defense-in-depth).
 *   2. Pay tokens can have shorter TTLs, independent rotation, and their
 *      own step-up MFA flow without polluting the primary auth context.
 *   3. The Pay portal can be deployed as a standalone micro-frontend in
 *      the future with zero coupling to the parent app's auth.
 *
 * Do NOT merge this with `src/context/AuthProvider.tsx`.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredPayAuth, getStoredPayAuth, payApi, setStoredPayAuth, PayUser } from './payApi';

interface PayAuthContextValue {
  user: PayUser | null;
  accessToken: string | null;
  loading: boolean;
  isAuthed: boolean;
  login: (emailOrPhone: string, password: string) => Promise<PayUser>;
  logout: () => Promise<void>;
}

const PayAuthContext = createContext<PayAuthContextValue | undefined>(undefined);

export function PayAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PayUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredPayAuth();
    if (stored.accessToken && stored.user) {
      setAccessToken(stored.accessToken);
      setUser(stored.user);
    }
    setLoading(false);
  }, []);

  const login = async (emailOrPhone: string, password: string) => {
    const data = await payApi.login(emailOrPhone, password);
    setStoredPayAuth(data);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await payApi.logout();
    } finally {
      clearStoredPayAuth();
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthed: Boolean(user && accessToken),
      login,
      logout,
    }),
    [user, accessToken, loading]
  );

  return <PayAuthContext.Provider value={value}>{children}</PayAuthContext.Provider>;
}

export function usePayAuth() {
  const ctx = useContext(PayAuthContext);
  if (!ctx) {
    // Fallback: return a safe anon context instead of crashing the pay portal
    return {
      user: null,
      accessToken: null,
      loading: false,
      isAuthed: false,
      login: async () => {
        throw new Error('Pay auth unavailable');
      },
      logout: async () => {
        clearStoredPayAuth();
      },
    };
  }
  return ctx;
}
