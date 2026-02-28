/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastTone = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
};

const TOAST_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-blue-200 bg-blue-50'
};

const TOAST_PROGRESS: Record<ToastTone, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500'
};

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: () => void;
}) {
  const tone = toast.tone || 'info';
  const duration = toast.duration || 5000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={clsx(
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border shadow-lg',
        'backdrop-blur-sm',
        TOAST_STYLES[tone]
      )}
      role="alert"
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {TOAST_ICONS[tone]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={clsx('absolute bottom-0 left-0 h-1', TOAST_PROGRESS[tone])}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>): string => {
      const id = uuidv4();
      const duration = t.duration || 5000;
      
      setToasts((prev) => {
        // Limit to 5 toasts maximum
        const newToasts = prev.length >= 5 ? prev.slice(1) : prev;
        return [...newToasts, { id, ...t }];
      });
      
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  // Convenience methods
  const success = useCallback(
    (title: string, description?: string) => push({ title, description, tone: 'success' }),
    [push]
  );

  const error = useCallback(
    (title: string, description?: string) => push({ title, description, tone: 'error', duration: 7000 }),
    [push]
  );

  const warning = useCallback(
    (title: string, description?: string) => push({ title, description, tone: 'warning' }),
    [push]
  );

  const info = useCallback(
    (title: string, description?: string) => push({ title, description, tone: 'info' }),
    [push]
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, dismissAll, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end justify-end gap-3 p-4 sm:justify-start sm:items-end sm:top-4 sm:bottom-auto"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
