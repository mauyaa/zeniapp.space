import React, { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimeoutModalProps {
  open: boolean;
  onStayLoggedIn: () => void;
  onLogOut: () => void;
}

export function SessionTimeoutModal({ open, onStayLoggedIn, onLogOut }: SessionTimeoutModalProps) {
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => stayRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
          <Clock className="w-6 h-6 shrink-0" aria-hidden />
          <h2
            id="session-timeout-title"
            className="text-lg font-semibold text-zinc-900 dark:text-white"
          >
            Still there?
          </h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
          You've been inactive for a while. Choose to stay logged in or sign out for security.
        </p>
        <div className="flex gap-3">
          <button
            ref={stayRef}
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 rounded-xl bg-zeni-foreground dark:bg-white text-white dark:text-zinc-900 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Stay logged in
          </button>
          <button
            type="button"
            onClick={onLogOut}
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
