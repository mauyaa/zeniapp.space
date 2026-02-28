import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { AuthPage } from './AuthPage';

const CONTACT_OPS_URL = 'mailto:zeniapp.ke@gmail.com?subject=Operations%20Support';
import { prefetchRoute } from '../../lib/prefetch';
import { ApiError } from '../../types/api';

type RoleTab = 'user' | 'agent' | 'admin';

function roleHome(role: RoleTab) {
  if (role === 'admin') return '/admin/verification';
  if (role === 'agent') return '/agent/dashboard';
  return '/app/home';
}

export function LoginPage({ forcedRole, locked: lockedProp }: { forcedRole?: RoleTab; locked?: boolean } = {}) {
  const params = useParams<{ role?: string }>();
  const paramRole: RoleTab | undefined =
    params.role === 'agent' || params.role === 'admin' ? (params.role as RoleTab) : undefined;

  const effectiveForcedRole = forcedRole ?? paramRole;
  const locked =
    lockedProp ??
    Boolean(paramRole === 'agent' || paramRole === 'admin' || forcedRole === 'agent' || forcedRole === 'admin');

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, clearLocalSession } = useAuth();
  const didClearForFreshLogin = useRef(false);

  // When sent from landing page with requireFreshLogin, clear any existing session so we never log in as another user
  useEffect(() => {
    const state = location.state as { from?: { pathname?: string; search?: string }; requireFreshLogin?: boolean } | null;
    if (!state?.requireFreshLogin || didClearForFreshLogin.current) return;
    didClearForFreshLogin.current = true;
    clearLocalSession();
    navigate('/login', { replace: true, state: { from: state.from } });
    // Intentionally run only on mount; we read location.state once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(emailOrPhone, password);

      // Persist or clear the "remember me" preference
      try {
        if (rememberMe) {
          localStorage.setItem('remember_me', '1');
        } else {
          localStorage.removeItem('remember_me');
          // For non-remembered sessions, store token in sessionStorage instead
          // so it's cleared when the browser tab closes
          const token = localStorage.getItem('token');
          if (token) {
            sessionStorage.setItem('session_token', token);
          }
        }
      } catch {
        // localStorage blocked — ignore gracefully
      }

      // Prefetch secondary routes for the user's portal so they're instant after login
      const portalRoutes: Record<RoleTab, string[]> = {
        user: ['/app/explore', '/app/messages', '/app/saved', '/app/viewings'],
        agent: ['/agent/listings', '/agent/leads', '/agent/analytics', '/agent/messages'],
        admin: ['/admin/overview', '/admin/reports', '/admin/users', '/admin/listings'],
      };
      (portalRoutes[user.role as RoleTab] ?? []).forEach(prefetchRoute);

      // Agent/Admin portals: only allow access if the logged-in user has the correct role
      if (effectiveForcedRole === 'agent' && user.role !== 'agent') {
        setError('You do not have access to the Agent portal. Use the main login at /login for buyer or tenant access.');
        setLoading(false);
        return;
      }
      if (effectiveForcedRole === 'admin' && user.role !== 'admin') {
        setError('You do not have access to the Admin portal. Use the main login at /login for buyer or tenant access.');
        setLoading(false);
        return;
      }

      const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      const from = fromState
        ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : undefined;
      const target = from || roleHome(user.role as RoleTab);
      // Defer so AuthProvider state is committed before protected route renders (avoids redirect back to login)
      setTimeout(() => navigate(target, { replace: true }), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      if (err instanceof ApiError && err.status === 429) {
        setCooldownSec(60);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cooldownSec === null || cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s === null || s <= 1 ? null : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  const adminLoginLayout = (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-white" style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
      {/* Background watermark */}
      <div
        className="pointer-events-none absolute select-none whitespace-nowrap font-black"
        style={{ fontSize: '25vw', color: 'transparent', WebkitTextStroke: '1px #18181b', zIndex: 0 }}
        aria-hidden
      >
        ADMIN
      </div>

      <div
        className="relative z-10 w-full max-w-[440px] bg-white p-[60px] text-black"
        style={{ boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)' }}
      >
        <span className="mb-[30px] block font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-red-500">
          Restricted Area
        </span>

        <div className="mb-10 flex items-baseline text-[48px] font-black tracking-tight" style={{ letterSpacing: '-3px' }}>
          ZENI<span className="ml-0.5 text-[54px] leading-none text-green-500">.</span>
        </div>

        <form onSubmit={onSubmit} autoComplete="off" aria-busy={loading} aria-describedby={error ? 'login-error' : undefined}>
          <div className="mb-10">
            <label className="mb-3 block font-mono text-[11px] font-extrabold uppercase tracking-widest text-black">
              Admin ID
            </label>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
              placeholder="Email or 07xx"
              className="w-full border-0 border-b-[3px] border-black bg-transparent py-2.5 text-2xl font-bold text-black outline-none placeholder:text-[#d1d1d6]"
            />
          </div>

          <div className="mb-10">
            <label className="mb-3 block font-mono text-[11px] font-extrabold uppercase tracking-widest text-black">
              Master Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border-0 border-b-[3px] border-black bg-transparent py-2.5 text-2xl font-bold text-black outline-none placeholder:text-[#d1d1d6]"
            />
          </div>

          {error && (
            <div id="login-error" className="mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || cooldownSec !== null}
            className="w-full bg-black py-[22px] font-mono text-[13px] font-extrabold uppercase tracking-[0.25em] text-white transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authorizing...' : cooldownSec !== null ? `Try again in ${cooldownSec}s` : 'Authorize Entry'}
          </button>
        </form>

        <div className="mt-10 text-center text-xs font-bold uppercase tracking-widest text-green-500">
          Verification · Moderation · Ops
        </div>
        <p className="mt-6 text-center">
          <a href={CONTACT_OPS_URL} className="text-[11px] font-semibold text-zinc-500 hover:text-black">
            Contact Operations Support
          </a>
        </p>
      </div>
    </div>
  );

  const agentSecureLayout = (
    <div className="flex h-screen w-screen flex-col overflow-y-auto overflow-x-hidden md:flex-row md:overflow-hidden" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Left: Brand & context (black) */}
      <div className="flex flex-1 flex-col justify-between bg-black p-6 text-white md:p-[60px]">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-red-500">
          Internal System Access
        </div>
        <div>
          <h1 className="m-0 text-[clamp(40px,8vw,100px)] font-black leading-[0.85] tracking-[-4px]" style={{ letterSpacing: '-4px' }}>
            AGENT<br />SECURE
          </h1>
          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-green-500">
            Listings · Leads · Messages
          </p>
        </div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-600">
          ZENI_CORE_AUTH_v2.6
        </div>
      </div>

      {/* Right: Form (white) */}
      <div className="flex flex-1 items-center justify-center bg-white px-5 py-16 text-black md:p-10">
        <div className="relative w-full max-w-[400px]">
          <form onSubmit={onSubmit} autoComplete="off" aria-busy={loading} aria-describedby={error ? 'login-error' : undefined}>
            <div className="mb-10 flex items-baseline text-[28px] font-black tracking-tight">
              ZENI<span className="text-[32px] leading-none text-green-500">.</span>
            </div>

            <div className="mb-12">
              <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                Account Identifier
              </label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                placeholder="Email or 07xx"
                className="w-full border-0 border-b-[3px] border-black bg-transparent py-3 text-2xl font-semibold text-black outline-none placeholder:text-[#d1d1d6] placeholder:text-lg"
              />
            </div>

            <div className="mb-12">
              <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                Private Key
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border-0 border-b-[3px] border-black bg-transparent py-3 text-2xl font-semibold text-black outline-none placeholder:text-[#d1d1d6] placeholder:text-lg"
              />
            </div>

            {error && (
              <div id="login-error" className="mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldownSec !== null}
              className="w-full bg-black py-[22px] font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-white transition-all duration-200 hover:bg-zinc-800 hover:tracking-[0.25em] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:tracking-[0.2em]"
            >
              {loading ? 'Authorizing...' : cooldownSec !== null ? `Try again in ${cooldownSec}s` : 'Authorize Entry'}
            </button>
          </form>
          <p className="mt-8 text-center md:absolute md:bottom-0 md:right-0 md:mt-0 md:text-right">
            <a href={CONTACT_OPS_URL} className="text-[11px] font-semibold text-zinc-500 hover:text-black">
              Contact Operations Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );

  const secureLayout = effectiveForcedRole === 'admin' ? adminLoginLayout : agentSecureLayout;

  if (locked) return secureLayout;

  return (
    <AuthPage
      initialMode="login"
      onModeChange={(mode) => {
        navigate(mode === 'login' ? '/login' : '/register', { replace: true });
      }}
    />
  );
}
