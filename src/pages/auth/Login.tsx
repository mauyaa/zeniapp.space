import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { AuthPage } from './AuthPage';

const CONTACT_OPS_URL = 'mailto:zeniapp.ke@gmail.com?subject=Operations%20Support';
import { Eye, EyeOff } from 'lucide-react';
import { prefetchRoute } from '../../lib/prefetch';
import { ApiError } from '../../types/api';

import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

type RoleTab = 'user' | 'agent' | 'admin';

function roleHome(role: RoleTab) {
  if (role === 'admin') return '/admin/verification';
  if (role === 'agent') return '/agent/dashboard';
  return '/app/home';
}

export function LoginPage({
  forcedRole,
  locked: lockedProp,
}: { forcedRole?: RoleTab; locked?: boolean } = {}) {
  const params = useParams<{ role?: string }>();
  const paramRole: RoleTab | undefined =
    params.role === 'agent' || params.role === 'admin' ? (params.role as RoleTab) : undefined;

  const effectiveForcedRole = forcedRole ?? paramRole;
  const locked =
    lockedProp ??
    Boolean(
      paramRole === 'agent' ||
      paramRole === 'admin' ||
      forcedRole === 'agent' ||
      forcedRole === 'admin'
    );

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [requireOtp, setRequireOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, clearLocalSession } = useAuth();
  const didClearForFreshLogin = useRef(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

  // When sent from landing page with requireFreshLogin, clear any existing session so we never log in as another user
  useEffect(() => {
    const state = location.state as {
      from?: { pathname?: string; search?: string };
      requireFreshLogin?: boolean;
    } | null;
    if (!state?.requireFreshLogin || didClearForFreshLogin.current) return;
    didClearForFreshLogin.current = true;
    clearLocalSession();
    navigate('/login', { replace: true, state: { from: state.from } });
    // Intentionally run only on mount; we read location.state once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSuccess = async (credential: string) => {
    setGoogleError(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential);

      // Agent/Admin portals: only allow access if the logged-in user has the correct role
      if (effectiveForcedRole === 'agent' && user.role !== 'agent') {
        setGoogleError('You do not have access to the Agent portal. Use the main login at /login.');
        setLoading(false);
        return;
      }
      if (effectiveForcedRole === 'admin' && user.role !== 'admin') {
        setGoogleError('You do not have access to the Admin portal. Use the main login at /login.');
        setLoading(false);
        return;
      }

      const fromState = (
        location.state as { from?: { pathname?: string; search?: string; hash?: string } }
      )?.from;
      const from = fromState
        ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : undefined;
      const target = from || roleHome(user.role as RoleTab);
      setTimeout(() => navigate(target, { replace: true }), 0);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGoogleError(null);
    setError(null);
    try {
      const user = await login(emailOrPhone, password, { otp });

      // Prefetch secondary routes for the user's portal so they're instant after login
      const portalRoutes: Record<RoleTab, string[]> = {
        user: ['/app/explore', '/app/messages', '/app/saved', '/app/viewings'],
        agent: ['/agent/listings', '/agent/leads', '/agent/analytics', '/agent/messages'],
        admin: ['/admin/overview', '/admin/reports', '/admin/users', '/admin/listings'],
      };
      (portalRoutes[user.role as RoleTab] ?? []).forEach(prefetchRoute);

      // Agent/Admin portals: only allow access if the logged-in user has the correct role
      if (effectiveForcedRole === 'agent' && user.role !== 'agent') {
        setError(
          'You do not have access to the Agent portal. Use the main login at /login for buyer or tenant access.'
        );
        setLoading(false);
        return;
      }
      if (effectiveForcedRole === 'admin' && user.role !== 'admin') {
        setError(
          'You do not have access to the Admin portal. Use the main login at /login for buyer or tenant access.'
        );
        setLoading(false);
        return;
      }

      const fromState = (
        location.state as { from?: { pathname?: string; search?: string; hash?: string } }
      )?.from;
      const from = fromState
        ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : undefined;
      const target = from || roleHome(user.role as RoleTab);
      // Defer so AuthProvider state is committed before protected route renders (avoids redirect back to login)
      setTimeout(() => navigate(target, { replace: true }), 0);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OTP_REQUIRED') {
        setRequireOtp(true);
        setError(err.message || 'Please enter your Security Token (OTP)');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
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
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-white font-outfit">
      {/* Background watermark */}
      <div
        className="pointer-events-none absolute select-none whitespace-nowrap font-black"
        style={{
          fontSize: '25vw',
          color: 'transparent',
          WebkitTextStroke: '1px #18181b',
          zIndex: 0,
        }}
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

        <div
          className="mb-10 flex items-baseline text-[48px] font-black tracking-tight"
          style={{ letterSpacing: '-3px' }}
        >
          ZENI<span className="ml-0.5 text-[54px] leading-none text-green-500">.</span>
        </div>

        <form
          onSubmit={onSubmit}
          autoComplete="off"
          aria-busy={loading}
          aria-describedby={error ? 'login-error' : undefined}
        >
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

          <div className="mb-10 relative">
            <label className="mb-3 block font-mono text-[11px] font-extrabold uppercase tracking-widest text-black">
              Master Key
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              className="w-full border-0 border-b-[3px] border-black bg-transparent py-2.5 text-2xl font-bold text-black outline-none placeholder:text-[#d1d1d6] transition-colors focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 bottom-3 text-zinc-400 hover:text-black transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {requireOtp && (
            <div className="mb-10 relative animate-in fade-in slide-in-from-top-4 duration-500">
              <label className="mb-3 block font-mono text-[11px] font-extrabold uppercase tracking-widest text-black">
                Security Token
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="000000"
                className="w-full border-0 border-b-[3px] border-black bg-transparent py-2.5 text-2xl font-bold text-black outline-none placeholder:text-[#d1d1d6] transition-colors focus:border-green-500"
              />
            </div>
          )}

          {error && (
            <div
              id="login-error"
              className="mb-4 rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {googleError && (
            <div
              className="mb-4 rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md"
              role="alert"
            >
              {googleError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || cooldownSec !== null}
            className="w-full bg-black py-[22px] font-mono text-[13px] font-extrabold uppercase tracking-[0.25em] text-white transition-colors hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Authorizing...'
              : cooldownSec !== null
                ? `Try again in ${cooldownSec}s`
                : 'Authorize Entry'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest bg-white px-4 text-zinc-400">
              Secure SSO
            </div>
          </div>
          <GoogleSignInButton
            clientId={GOOGLE_CLIENT_ID}
            onSuccess={handleGoogleSuccess}
            onError={setGoogleError}
            disabled={loading}
          />
        </div>

        <div className="mt-10 text-center text-xs font-bold uppercase tracking-widest text-green-500">
          Verification | Moderation | Ops
        </div>
        <p className="mt-6 text-center">
          <a
            href={CONTACT_OPS_URL}
            className="text-[11px] font-semibold text-zinc-500 hover:text-black"
          >
            Contact Operations Support
          </a>
        </p>
      </div>
    </div>
  );

  const agentSecureLayout = (
    <div className="flex h-screen w-screen flex-col overflow-y-auto overflow-x-hidden md:flex-row md:overflow-hidden font-outfit">
      {/* Left: Brand & context (black) */}
      <div className="flex flex-1 flex-col justify-between bg-black p-6 text-white md:p-[60px]">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-red-500">
          Internal System Access
        </div>
        <div>
          <h1
            className="m-0 text-[clamp(40px,8vw,100px)] font-black leading-[0.85] tracking-[-4px]"
            style={{ letterSpacing: '-4px' }}
          >
            AGENT
            <br />
            SECURE
          </h1>
          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-green-500">
            Listings | Leads | Messages
          </p>
        </div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-600">ZENI_CORE_AUTH_v2.6</div>
      </div>

      {/* Right: Form (white) */}
      <div className="flex flex-1 items-center justify-center bg-white px-5 py-16 text-black md:p-10">
        <div className="relative w-full max-w-[400px]">
          <form
            onSubmit={onSubmit}
            autoComplete="off"
            aria-busy={loading}
            aria-describedby={error ? 'login-error' : undefined}
          >
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

            <div className="mb-12 relative">
              <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                Private Key
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="w-full border-0 border-b-[3px] border-black bg-transparent py-3 text-2xl font-semibold text-black outline-none placeholder:text-[#d1d1d6] placeholder:text-lg transition-colors focus:border-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-zinc-300 hover:text-black transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {requireOtp && (
              <div className="mb-12 relative animate-in fade-in slide-in-from-top-4 duration-500">
                <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                  Security Token
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="000000"
                  className="w-full border-0 border-b-[3px] border-black bg-transparent py-3 text-2xl font-semibold text-black outline-none placeholder:text-[#d1d1d6] placeholder:text-lg transition-colors focus:border-green-500"
                />
              </div>
            )}

            {error && (
              <div
                id="login-error"
                className="mb-4 rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {googleError && (
              <div
                className="mb-4 rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md"
                role="alert"
              >
                {googleError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldownSec !== null}
              className="w-full bg-black py-[22px] font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-white transition-all duration-200 hover:bg-zinc-800 hover:tracking-[0.25em] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:tracking-[0.2em]"
            >
              {loading
                ? 'Authorizing...'
                : cooldownSec !== null
                  ? `Try again in ${cooldownSec}s`
                  : 'Authorize Entry'}
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest bg-white px-2 text-zinc-300">
                Enterprise Auth
              </div>
            </div>
            <GoogleSignInButton
              clientId={GOOGLE_CLIENT_ID}
              onSuccess={handleGoogleSuccess}
              onError={setGoogleError}
              disabled={loading}
            />
          </div>
          <p className="mt-8 text-center md:absolute md:bottom-0 md:right-0 md:mt-0 md:text-right">
            <a
              href={CONTACT_OPS_URL}
              className="text-[11px] font-semibold text-zinc-500 hover:text-black"
            >
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
