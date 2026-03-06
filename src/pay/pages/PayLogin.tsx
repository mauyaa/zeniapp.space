import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, Lock, ArrowLeft } from 'lucide-react';
import { usePayAuth } from '../PayAuthContext';

export function PayLogin() {
  const { login } = usePayAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const state = location.state as { from?: { pathname: string; search?: string } } | null;
  const fromPath = state?.from?.pathname || '/pay/dashboard';
  const fromSearch = state?.from?.search || '';
  const from = fromPath + fromSearch;

  useEffect(() => {
    const cached = localStorage.getItem('pay_login_hint');
    if (cached) setEmailOrPhone(cached);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(emailOrPhone, password);
      if (remember) {
        localStorage.setItem('pay_login_hint', emailOrPhone);
      } else {
        localStorage.removeItem('pay_login_hint');
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f6f7f8] font-sans text-[#1c1917] selection:bg-emerald-100 selection:text-emerald-900">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          box-shadow: 0 0 0 40px #f8f8f7 inset !important;
          -webkit-text-fill-color: #1f2933 !important;
        }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
        className="relative z-10 mx-4 flex h-auto w-full max-w-[1220px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_70px_-32px_rgba(0,0,0,0.3)] md:h-[600px]"
      >
        {/* left form */}
        <div className="relative flex w-full flex-col justify-center bg-white px-10 md:w-[55%] md:px-14">
          <div className="mb-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#d6d3d1] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600 transition-colors hover:border-[#0f5132] hover:text-[#0f5132]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="Go to Zeni landing page"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#0f5132]">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#1c1917]">
                ZENI<span className="text-green-500">.</span>
              </span>
            </Link>
          </div>

          <div className="mt-2">
            <h1 className="mb-3 text-[32px] font-light text-[#1f2933]">Secure Payment</h1>
            <p className="mb-10 text-sm text-stone-500">
              Log in to view invoices and manage transactions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-[520px]" autoComplete="off">
              <div>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-[#e7e7e3] bg-[#f6f6f5] px-4 py-4 text-sm text-[#1c1917] outline-none transition-all focus:border-[#0f5132] focus:bg-white focus:shadow-[0_10px_28px_-22px_rgba(0,0,0,0.35)] placeholder:text-stone-400"
                  placeholder="Client Email"
                />
              </div>

              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#e7e7e3] bg-[#f6f6f5] px-4 py-4 text-sm text-[#1c1917] outline-none transition-all focus:border-[#0f5132] focus:bg-white focus:shadow-[0_10px_28px_-22px_rgba(0,0,0,0.35)] placeholder:text-stone-400"
                  placeholder="Secure Password"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-xs text-red-600"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-[#064e3b] focus:ring-[#064e3b]/20"
                  />
                  <span className="text-xs text-stone-600 transition-colors hover:text-stone-900">
                    Keep me signed in
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot')}
                  className="text-xs font-semibold text-[#0f5132] hover:text-emerald-800 hover:underline"
                >
                  Forgot credentials?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-lg bg-[#0f5132] py-4 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white shadow-[0_18px_38px_-18px_rgba(0,0,0,0.35)] transition-all hover:bg-[#0c3f27] hover:shadow-[0_18px_42px_-18px_rgba(0,0,0,0.38)] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 text-emerald-400 transition-colors group-hover:text-white" />
                    <span>Authenticate & Pay</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-10 flex w-full justify-center">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.25em] text-stone-500 uppercase">
              <Lock className="h-3 w-3 text-[#0f5132]" />
              <span>Bank-grade 256-bit encryption</span>
            </div>
          </div>
        </div>

        {/* right visual */}
        <div className="relative hidden w-1/2 overflow-hidden bg-stone-900 md:block">
          <motion.img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80"
            alt="Luxury Property"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            animate={{ scale: [1, 1.1] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f5132] via-transparent to-transparent opacity-80" />

          <div className="absolute bottom-12 left-12 right-12">
            <div className="rounded-xl border border-white/15 bg-white/12 p-5 backdrop-blur-md shadow-lg shadow-black/25">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-white">System Status</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div className="space-y-2">
                <StatusRow label="PAYMENT GATEWAY" status="ONLINE" />
                <StatusRow label="MPESA EXPRESS" status="ONLINE" />
                <StatusRow label="CARD PROCESSING" status="ONLINE" />
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-white/40">
              Authorized Access Only. All activities are monitored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex justify-between font-mono text-[10px] text-stone-300">
      <span>{label}</span>
      <div className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>{status}</span>
      </div>
    </div>
  );
}
