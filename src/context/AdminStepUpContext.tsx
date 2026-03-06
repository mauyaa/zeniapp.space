/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { adminStepUp } from '../lib/api';
import { useToast } from './ToastContext';

type PendingAction = {
  attempt: () => void;
  resolve?: (value: unknown) => void;
  reject?: (reason?: unknown) => void;
};

type AdminStepUpContextValue = {
  runWithStepUp: <T>(fn: () => Promise<T>) => Promise<T>;
  open: boolean;
  loading: boolean;
  error: string;
  submit: (code: string) => Promise<void>;
  close: () => void;
};

const AdminStepUpContext = createContext<AdminStepUpContextValue | null>(null);

const getErrorCode = (err: unknown) => {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== 'object') return fallback;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' && message ? message : fallback;
};

export function AdminStepUpProvider({ children }: { children: React.ReactNode }) {
  const { error: toastError, success } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);

  const runWithStepUp = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const attempt = () => {
          fn()
            .then(resolve)
            .catch((err: unknown) => {
              const code = getErrorCode(err);
              if (code === 'STEP_UP_REQUIRED' || code === 'STEP_UP_EXPIRED') {
                setPending({ attempt });
                setOpen(true);
                setError('');
                return;
              }
              reject(err);
            });
        };
        attempt();
      }),
    []
  );

  const submit = useCallback(
    async (code: string) => {
      if (!pending) return;
      setLoading(true);
      setError('');
      try {
        await adminStepUp(code);
        success('Step-up verified');
        setOpen(false);
        const next = pending.attempt;
        setPending(null);
        next();
      } catch (e: unknown) {
        const msg = getErrorMessage(e, 'Verification failed');
        setError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    },
    [pending, success, toastError]
  );

  const close = useCallback(() => {
    setOpen(false);
    setPending(null);
    setError('');
  }, []);

  return (
    <AdminStepUpContext.Provider value={{ runWithStepUp, open, loading, error, submit, close }}>
      {children}
    </AdminStepUpContext.Provider>
  );
}

export function useAdminStepUp() {
  const ctx = useContext(AdminStepUpContext);
  if (!ctx) throw new Error('useAdminStepUp must be used within AdminStepUpProvider');
  return ctx;
}
