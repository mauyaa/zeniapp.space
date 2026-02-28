import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { validateEmailOrPhone, passwordScore, validatePassword } from '../../lib/validation';
import { ApiError } from '../../types/api';
const loginEmailError = (v: string) => validateEmailOrPhone(v);
const loginPasswordError = (v: string) => (v ? undefined : 'Password is required');

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

type AuthMode = 'login' | 'register';

type AuthPageProps = {
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
};

type RegisterErrors = {
  name?: string;
  emailOrPhone?: string;
  password?: string;
  confirm?: string;
  agree?: string;
};

export function AuthPage({ initialMode = 'login', onModeChange }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginCooldownSec, setLoginCooldownSec] = useState<number | null>(null);
  const [loginTouched, setLoginTouched] = useState<{ emailOrPhone?: boolean; password?: boolean }>({});

  const [registerForm, setRegisterForm] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirm: '',
    agree: true
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerTouched, setRegisterTouched] = useState<Record<string, boolean>>({});

  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  const registerErrors: RegisterErrors = useMemo(() => {
    const next: RegisterErrors = {};
    if (!registerForm.name.trim()) next.name = 'Name is required';
    else if (registerForm.name.trim().length < 2) next.name = 'Name is too short';

    next.emailOrPhone = validateEmailOrPhone(registerForm.emailOrPhone);

    next.password = validatePassword(registerForm.password);

    if (!registerForm.confirm) next.confirm = 'Please confirm your password';
    else if (registerForm.confirm !== registerForm.password) next.confirm = 'Passwords do not match';

    if (!registerForm.agree) next.agree = 'Please accept the terms';

    return next;
  }, [registerForm]);

  const strength = passwordScore(registerForm.password);
  const strengthBars = [
    strength >= 2 ? 'bg-zeni-foreground' : 'bg-zinc-200 dark:bg-zinc-700',
    strength >= 4 ? 'bg-zeni-foreground' : 'bg-zinc-200 dark:bg-zinc-700',
    strength >= 5 ? 'bg-zeni-foreground' : 'bg-zinc-200 dark:bg-zinc-700'
  ];

  const handleModeChange = (mode: AuthMode) => {
    setIsLogin(mode === 'login');
    onModeChange?.(mode);
  };

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const user = await login(loginEmailOrPhone, loginPassword);
      const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      let from = fromState
        ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : undefined;
      // Do not send user to agent/admin URLs if their role does not match (security)
      if (from?.startsWith('/agent') && user.role !== 'agent') from = undefined;
      if (from?.startsWith('/admin') && user.role !== 'admin') from = undefined;
      const home =
        user.role === 'admin' ? '/admin/verification' : user.role === 'agent' ? '/agent/dashboard' : '/app/home';
      const target = from || home;
      setTimeout(() => navigate(target, { replace: true }), 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setLoginError(msg);
      if (err instanceof ApiError && err.status === 429) {
        setLoginCooldownSec(60);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (loginCooldownSec === null || loginCooldownSec <= 0) return;
    const t = setInterval(() => {
      setLoginCooldownSec((s) => (s === null || s <= 1 ? null : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [loginCooldownSec]);

  const handleGoogleSuccess = async (credential: string) => {
    setGoogleError(null);
    try {
      const user = await loginWithGoogle(credential);
      const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      let from = fromState
        ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : undefined;
      if (from?.startsWith('/agent') && user.role !== 'agent') from = undefined;
      if (from?.startsWith('/admin') && user.role !== 'admin') from = undefined;
      const home =
        user.role === 'admin' ? '/admin/verification' : user.role === 'agent' ? '/agent/dashboard' : '/app/home';
      const target = from || home;
      setTimeout(() => navigate(target, { replace: true }), 0);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const onRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);

    if (Object.values(registerErrors).some(Boolean)) {
      setRegisterTouched({ name: true, emailOrPhone: true, password: true, confirm: true, agree: true });
      setRegisterLoading(false);
      return;
    }

    try {
      const user = await register({
        name: registerForm.name,
        emailOrPhone: registerForm.emailOrPhone,
        password: registerForm.password
      });
      const home =
        user.role === 'admin' ? '/admin/verification' : user.role === 'agent' ? '/agent/dashboard' : '/app/home';
      setTimeout(() => navigate(home, { replace: true }), 0);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'USER_EXISTS' || err.status === 409) {
          setRegisterError('An account already exists with this email or phone. Try logging in instead.');
        } else if (err.status === 400) {
          setRegisterError('Please double-check your details and try again.');
        } else {
          setRegisterError(err.message || 'Registration failed');
        }
      } else {
        setRegisterError('Registration failed');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh bg-zeni-background font-body text-zeni-foreground">
      <div className="hidden md:flex md:w-[45%] bg-zeni-foreground relative flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 opacity-60 mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1950&q=80"
            alt="Zeni Architecture"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10">
          <Link to="/" className="text-3xl font-heading font-semibold tracking-tight hover:opacity-90 transition-opacity text-white">
            ZENI<span className="text-green-400">.</span>
          </Link>
        </div>

        <div className="relative z-10">
          <div className="mb-6 w-12 h-1 bg-white" />
          <h2 className="text-4xl font-light leading-tight mb-4">
            &ldquo;Curated homes, secure messaging, and elegant workflows.&rdquo;
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Concierge Level Support
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
            <span className="border border-white/20 px-3 py-1">Verified agents</span>
            <span className="border border-white/20 px-3 py-1">Secure viewings</span>
            <span className="border border-white/20 px-3 py-1">Document checks</span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-[55%] flex flex-col justify-start md:justify-center items-center relative bg-zeni-surface border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto min-h-svh">
        <div className="w-full max-w-md px-8 py-12">
          <div
            className={`transition-all duration-500 ease-in-out ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 hidden'
              }`}
          >
            <div className="mb-12">
              <span className="zeni-spec-label text-zinc-500 mb-2 block">
                Authentication
              </span>
              <h1 className="text-4xl font-light tracking-tight text-zeni-foreground font-serif">Welcome Back</h1>
            </div>

            <form className="space-y-8" onSubmit={onLoginSubmit}>
              <FloatingInput
                id="login-email"
                label="Email or Phone"
                type="text"
                value={loginEmailOrPhone}
                onChange={(value) => setLoginEmailOrPhone(value)}
                onBlur={() => setLoginTouched((p) => ({ ...p, emailOrPhone: true }))}
                required
                error={loginTouched.emailOrPhone ? loginEmailError(loginEmailOrPhone) : undefined}
              />

              <div className="relative">
                <FloatingInput
                  id="login-pass"
                  label="Password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(value) => setLoginPassword(value)}
                  onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
                  required
                  error={loginTouched.password ? loginPasswordError(loginPassword) : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-0 top-3 text-zinc-400 hover:text-zeni-foreground transition-colors"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  <Eye size={18} />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center text-sm text-zinc-500 cursor-pointer hover:text-zeni-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-3 accent-zeni-foreground w-4 h-4 rounded"
                  />
                  <span className="tracking-wide text-xs font-medium uppercase">
                    Keep me logged in
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot')}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zeni-foreground transition-colors border-b border-transparent hover:border-zeni-foreground pb-0.5"
                >
                  Forgot Password?
                </button>
              </div>

              {loginError && (
                <div className="border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || loginCooldownSec !== null}
                className="w-full bg-green-500 hover:bg-green-600 text-white transition-colors py-4 uppercase tracking-widest text-xs font-bold flex justify-center items-center group disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {loginLoading ? 'Signing in...' : loginCooldownSec !== null ? `Try again in ${loginCooldownSec}s` : 'Log In'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest bg-zeni-surface px-4 text-zinc-500">
                Or continue with
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <GoogleSignInButton
                clientId={GOOGLE_CLIENT_ID}
                onSuccess={handleGoogleSuccess}
                onError={setGoogleError}
                disabled={loginLoading || loginCooldownSec !== null}
              />
            </div>
            {googleError && (
              <p className="text-sm text-rose-600 dark:text-rose-400 mb-4 text-center" role="alert">
                {googleError}
              </p>
            )}

            <div className="text-center">
              <p className="text-zinc-500 text-sm">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className="text-zeni-foreground font-bold uppercase tracking-widest text-xs ml-2 hover:underline underline-offset-4 transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>

          <div
            className={`transition-all duration-500 ease-in-out ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 hidden'
              }`}
          >
            <div className="mb-10">
              <span className="zeni-spec-label text-zinc-500 mb-2 block">
                Registration
              </span>
              <h1 className="text-4xl font-light tracking-tight text-zeni-foreground font-serif">Create Account</h1>
            </div>

            <form className="space-y-6" onSubmit={onRegisterSubmit}>
              <FloatingInput
                id="reg-name"
                label="Full Name"
                type="text"
                value={registerForm.name}
                onChange={(value) => setRegisterForm((prev) => ({ ...prev, name: value }))}
                onBlur={() => setRegisterTouched((prev) => ({ ...prev, name: true }))}
                required
                error={registerTouched.name ? registerErrors.name : undefined}
              />
              <FloatingInput
                id="reg-email"
                label="Email or Phone"
                type="text"
                value={registerForm.emailOrPhone}
                onChange={(value) => setRegisterForm((prev) => ({ ...prev, emailOrPhone: value }))}
                onBlur={() => setRegisterTouched((prev) => ({ ...prev, emailOrPhone: true }))}
                required
                error={registerTouched.emailOrPhone ? registerErrors.emailOrPhone : undefined}
              />

              <div className="relative">
                <FloatingInput
                  id="reg-pass"
                  label="Create Password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  value={registerForm.password}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
                  onBlur={() => setRegisterTouched((prev) => ({ ...prev, password: true }))}
                  required
                  error={registerTouched.password ? registerErrors.password : undefined}
                />
                <div className="flex space-x-1 absolute right-0 top-0 mt-[-20px]">
                  {strengthBars.map((bar, idx) => (
                    <div key={`strength-${idx}`} className={`w-8 h-1 rounded-full ${bar}`} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  className="absolute right-0 top-3 text-gray-400 hover:text-black"
                  aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  <Eye size={18} />
                </button>
              </div>

              <FloatingInput
                id="reg-confirm"
                label="Confirm Password"
                type="password"
                value={registerForm.confirm}
                onChange={(value) => setRegisterForm((prev) => ({ ...prev, confirm: value }))}
                onBlur={() => setRegisterTouched((prev) => ({ ...prev, confirm: true }))}
                required
                error={registerTouched.confirm ? registerErrors.confirm : undefined}
              />

              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={registerForm.agree}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, agree: e.target.checked }))}
                  onBlur={() => setRegisterTouched((prev) => ({ ...prev, agree: true }))}
                  className="mt-1 mr-3 accent-zeni-foreground w-4 h-4 rounded"
                />
                <span className="text-sm text-zinc-500 leading-relaxed">
                  I agree to the Zeni{' '}
                  <span className="text-zeni-foreground font-bold underline decoration-1">Terms of Service</span> and{' '}
                  <span className="text-zeni-foreground font-bold underline decoration-1">Privacy Policy</span>.
                </span>
              </div>
              {registerTouched.agree && registerErrors.agree && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{registerErrors.agree}</p>
              )}

              {registerError && (
                <div className="border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
                  {registerError}
                </div>
              )}
              <button
                type="submit"
                disabled={registerLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white transition-colors py-4 uppercase tracking-widest text-xs font-bold flex justify-center items-center group disabled:opacity-50 rounded-lg"
              >
                {registerLoading ? 'Creating...' : 'Start Membership'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="text-center mt-8">
              <p className="text-zinc-500 text-sm">
                Already a member?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className="text-zeni-foreground font-bold uppercase tracking-widest text-xs ml-2 hover:underline underline-offset-4 transition-colors"
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
          <div className="mt-10 text-center text-[10px] uppercase tracking-widest text-zinc-500">
            Need help? <span className="text-zeni-foreground">zeniapp.ke@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const FloatingInput = ({
  id,
  label,
  type,
  value,
  onChange,
  onBlur,
  required,
  error
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
}) => (
  <div className="relative group">
    <input
      type={type}
      id={id}
      className="peer w-full border-b border-zinc-200 dark:border-zinc-600 py-3 bg-transparent text-zeni-foreground outline-none focus:border-zeni-foreground transition-colors placeholder-transparent"
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      required={required}
      aria-invalid={Boolean(error)}
    />
    <label
      htmlFor={id}
      className="absolute left-0 -top-2.5 text-xs font-bold uppercase tracking-widest text-zeni-foreground transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-zinc-400 peer-placeholder-shown:top-3 peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-zeni-foreground peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest cursor-text"
    >
      {label}
    </label>
    {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
  </div>
);

export default AuthPage;
