import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, KeyRound, X } from 'lucide-react';
import { Button } from '../ui/Button';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function AdminStepUpModal({
  open,
  loading,
  error,
  onClose,
  onSubmit
}: {
  open: boolean;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const getFocusables = useCallback((container: HTMLElement | null): HTMLElement[] => {
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    );
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      previousActiveRef.current = document.activeElement as HTMLElement | null;
      setCode('');
      setTimeout(() => {
        const el = document.getElementById('admin-step-up-code') as HTMLInputElement | null;
        el?.focus();
      }, 100);
    } else if (!open && previousActiveRef.current) {
      previousActiveRef.current.focus();
      previousActiveRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;
      const focusables = getFocusables(containerRef.current);
      if (focusables.length === 0) return;
      const current = document.activeElement as HTMLElement;
      const idx = focusables.indexOf(current);
      if (idx === -1) return;
      if (e.shiftKey) {
        if (idx === 0) {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      } else {
        if (idx === focusables.length - 1) {
          e.preventDefault();
          focusables[0].focus();
        }
      }
    },
    [getFocusables]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div ref={containerRef} onKeyDown={handleKeyDown} className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-[#0b0b0f] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Admin Step-Up</div>
              <div className="text-xs text-zinc-400">Confirm a sensitive action with your MFA code.</div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-semibold text-zinc-400">One-time code</label>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <KeyRound className="h-4 w-4 text-yellow-400" />
            <input
              id="admin-step-up-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              placeholder="123456"
              autoComplete="one-time-code"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-lg bg-rose-900/20 border border-rose-800 px-3 py-2 text-xs text-rose-300">
              {error}
              <p className="mt-1 text-rose-400/80">If your code expired, cancel and try the action again to be prompted for a new code.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" tone="amber" loading={loading} onClick={() => onSubmit(code)}>
            Verify & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
