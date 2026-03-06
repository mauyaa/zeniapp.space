import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { forgotPassword } from '../../lib/api';

export function ForgotPasswordPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);
    try {
      const res = await forgotPassword(emailOrPhone.trim());
      setStatus('sent');
      if (res.resetToken) {
        setMessage(`Success! Your reset code is: ${res.resetToken}`);
        // Pro-tip: Suggest clicking to reset
        setTimeout(() => {
          navigate(`/reset?token=${res.resetToken}`);
        }, 3000);
      } else {
        setMessage('Check your inbox (or server logs) for a reset link.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not send reset link');
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
            Account Recovery
          </div>
          <h1 className="text-3xl font-light tracking-tight">Reset your password</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Enter the email or phone you used for ZENI. We&apos;ll send you a secure link to reset
            your password.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 text-slate-900 font-semibold">
              <Mail className="w-4 h-4" />
              Email or phone
            </span>
            <input
              type="text"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              placeholder="you@example.com or 07xx"
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
              {status === 'sent' && (
                <Link
                  to={`/reset?token=${message.split(': ').pop()}`}
                  className="block mt-2 font-bold underline"
                >
                  Click here to set new password now →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-2xl bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have a reset code?{' '}
          <Link to="/reset" className="font-semibold text-emerald-700 hover:text-emerald-600">
            Set new password
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">
            Go back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
