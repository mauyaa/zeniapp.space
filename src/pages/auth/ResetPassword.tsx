import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { resetPassword } from '../../lib/api';
import { validateResetPassword, passwordScore } from '../../lib/validation';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const passwordError = useMemo(() => validateResetPassword(password), [password]);
  const confirmError = useMemo(
    () => (confirm ? (password !== confirm ? 'Passwords do not match' : undefined) : undefined),
    [password, confirm]
  );
  const strength = useMemo(() => passwordScore(password), [password]);
  const strengthBars = [
    strength >= 2 ? 'bg-emerald-500' : 'bg-slate-200',
    strength >= 4 ? 'bg-emerald-500' : 'bg-slate-200',
    strength >= 5 ? 'bg-emerald-500' : 'bg-slate-200',
  ];
  const canSubmit = useMemo(
    () =>
      !passwordError && !confirmError && password === confirm && password.length >= 8 && !!token,
    [passwordError, confirmError, password, confirm, token]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    setMessage(null);
    try {
      await resetPassword(token, password);
      setStatus('done');
      setMessage('Password reset. You can sign in now.');
      setTimeout(() => navigate('/login', { replace: true }), 800);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            Secure Reset
          </div>
          <h1 className="text-3xl font-light tracking-tight">Set a new password</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Use at least 8 characters with a mix of letters and numbers.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Lock className="w-4 h-4" />
              New password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-100 outline-none ${
                passwordError
                  ? 'border-rose-300 focus:border-rose-500'
                  : 'border-slate-200 focus:border-emerald-500'
              }`}
              placeholder="At least 8 characters, mix of letters and numbers"
              minLength={8}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            <div className="flex gap-1">
              {strengthBars.map((bar, idx) => (
                <div key={idx} className={`h-1 flex-1 rounded-full ${bar}`} aria-hidden />
              ))}
            </div>
            {passwordError && (
              <p id="password-error" className="text-xs text-rose-600">
                {passwordError}
              </p>
            )}
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Lock className="w-4 h-4" />
              Confirm password
            </span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-100 outline-none ${
                confirmError
                  ? 'border-rose-300 focus:border-rose-500'
                  : 'border-slate-200 focus:border-emerald-500'
              }`}
              placeholder="********"
              minLength={8}
              aria-invalid={Boolean(confirmError)}
            />
            {confirmError && <p className="text-xs text-rose-600">{confirmError}</p>}
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              Reset token
            </span>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              placeholder="Paste the code from email"
            />
          </label>

          {message && (
            <div
              className={`rounded-2xl border px-3 py-2 text-sm ${
                status === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || status === 'loading'}
            className="w-full rounded-2xl bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Need a new code?{' '}
          <Link to="/forgot" className="font-semibold text-emerald-700 hover:text-emerald-600">
            Request reset
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Back to{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
