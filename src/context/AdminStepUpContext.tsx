/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { adminStepUp } from '../lib/api';
import { useToast } from './ToastContext';

type PendingAction = {
  attempt: () => void;
  reject: (reason?: unknown) => void;
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

type StepUpErrorCode = 'STEP_UP_CANCELLED';

function createStepUpError(code: StepUpErrorCode, message: string) {
  return Object.assign(new Error(message), { code });
}

export function isAdminStepUpCancelled(err: unknown) {
  return getErrorCode(err) === 'STEP_UP_CANCELLED';
}

export function AdminStepUpProvider({ children }: { children: React.ReactNode }) {
  const { success } = useToast();
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
                setPending({ attempt, reject });
                setOpen(true);
                setError(code === 'STEP_UP_EXPIRED' ? 'Code expired.' : '');
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
      if (!pending || loading) return;
      setLoading(true);
      setError('');
      try {
        await adminStepUp(code);
        success('Verified');
        const next = pending.attempt;
        setOpen(false);
        setPending(null);
        next();
      } catch (e: unknown) {
        setError(getErrorMessage(e, 'Verification failed'));
      } finally {
        setLoading(false);
      }
    },
    [loading, pending, success]
  );

  const close = useCallback(() => {
    const rejectPending = pending?.reject;
    setOpen(false);
    setPending(null);
    setLoading(false);
    setError('');
    rejectPending?.(createStepUpError('STEP_UP_CANCELLED', 'Cancelled'));
  }, [pending]);

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
