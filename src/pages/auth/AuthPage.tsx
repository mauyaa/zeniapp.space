import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { useAuth, type AuthUser } from '../../context/AuthProvider';
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

type LoginTouched = { emailOrPhone?: boolean; password?: boolean };
type RegisterFormState = {
  name: string;
  emailOrPhone: string;
  password: string;
  confirm: string;
  agree: boolean;
};
type RegisterTouchedState = Partial<Record<keyof RegisterFormState, boolean>>;
const TAGS = ['Certified', 'Private', 'Verified'];
type RedirectState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

type FloatingInputProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
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
  const [loginTouched, setLoginTouched] = useState<LoginTouched>({});

  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    name: '',
    emailOrPhone: '',
    password: '',
    confirm: '',
    agree: true,
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerTouched, setRegisterTouched] = useState<RegisterTouchedState>({});

  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  const loginErrors = useMemo(
    () => ({
      emailOrPhone: loginEmailError(loginEmailOrPhone),
      password: loginPasswordError(loginPassword),
    }),
    [loginEmailOrPhone, loginPassword]
  );

  const registerErrors: RegisterErrors = useMemo(() => {
    const next: RegisterErrors = {};
    if (!registerForm.name.trim()) next.name = 'Name is required';
    else if (registerForm.name.trim().length < 2) next.name = 'Name is too short';
    next.emailOrPhone = validateEmailOrPhone(registerForm.emailOrPhone);
    next.password = validatePassword(registerForm.password);
    if (!registerForm.confirm) next.confirm = 'Please confirm your password';
    else if (registerForm.confirm !== registerForm.password)
      next.confirm = 'Passwords do not match';
    if (!registerForm.agree) next.agree = 'Please accept the terms';
    return next;
  }, [registerForm]);

  const strength = passwordScore(registerForm.password);
  const strengthBars = [
    strength >= 2 ? 'bg-green-500' : 'bg-zinc-100',
    strength >= 4 ? 'bg-green-500' : 'bg-zinc-100',
    strength >= 5 ? 'bg-green-500' : 'bg-zinc-100',
  ];

  const markLoginTouched = useCallback((field: keyof LoginTouched) => {
    setLoginTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const updateRegisterField = useCallback(
    <K extends keyof RegisterFormState>(field: K, value: RegisterFormState[K]) => {
      setRegisterForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const markRegisterTouched = useCallback((field: keyof RegisterTouchedState) => {
    setRegisterTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleModeChange = useCallback(
    (mode: AuthMode) => {
      setIsLogin(mode === 'login');
      setLoginError(null);
      setRegisterError(null);
      setGoogleError(null);
      setLoginTouched({});
      setRegisterTouched({});
      onModeChange?.(mode);
    },
    [onModeChange]
  );

  const handleAuthSuccess = (user: AuthUser) => {
    const fromState = (location.state as RedirectState | null)?.from;
    let from = fromState
      ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
      : undefined;
    if (from?.startsWith('/agent') && user.role !== 'agent') from = undefined;
    if (from?.startsWith('/admin') && user.role !== 'admin') from = undefined;
    const home =
      user.role === 'admin'
        ? '/admin/verification'
        : user.role === 'agent'
          ? '/agent/dashboard'
          : '/app/home';
    const target = from || home;
    setTimeout(() => navigate(target, { replace: true }), 0);
  };

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginTouched({ emailOrPhone: true, password: true });

    if (Object.values(loginErrors).some(Boolean)) return;

    setLoginLoading(true);
    try {
      const user = await login(loginEmailOrPhone, loginPassword, { rememberMe });
      handleAuthSuccess(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setLoginError(msg);
      if (err instanceof ApiError && err.status === 429) setLoginCooldownSec(60);
    } finally {
      setLoginLoading(false);
    }
  };

  const onRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);
    if (Object.values(registerErrors).some(Boolean)) {
      setRegisterTouched({
        name: true,
        emailOrPhone: true,
        password: true,
        confirm: true,
        agree: true,
      });
      setRegisterLoading(false);
      return;
    }
    try {
      const user = await register({
        name: registerForm.name,
        emailOrPhone: registerForm.emailOrPhone,
        password: registerForm.password,
      });
      handleAuthSuccess(user);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'USER_EXISTS' || err.status === 409)) {
        setRegisterError('Account already exists. Try logging in.');
      } else if (err instanceof ApiError && err.status === 408) {
        setRegisterError('Server is waking up. Please wait a moment and try again.');
      } else {
        setRegisterError(
          err instanceof Error ? err.message : 'Registration failed. Please try again.'
        );
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setGoogleError(null);
    try {
      const user = await loginWithGoogle(credential, { rememberMe });
      handleAuthSuccess(user);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  useEffect(() => {
    if (loginCooldownSec === null || loginCooldownSec <= 0) return;
    const t = setInterval(
      () => setLoginCooldownSec((s) => (s === null || s <= 1 ? null : s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [loginCooldownSec]);

  return (
    <div className="flex min-h-svh bg-white font-body text-zinc-900 selection:bg-green-500 selection:text-white">
      {/* LEFT PANEL: Branding & Visuals */}
      <div className="hidden md:flex md:w-[45%] bg-zinc-950 relative flex-col justify-between p-16 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop"
            alt="Modern Interior"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        <div className="relative z-10">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity"
          >
            ZENI<span className="text-green-500">.</span>
          </Link>
        </div>

        <div className="relative z-10">
          <div className="mb-8 w-16 h-px bg-green-500/60" />
          <h2 className="text-7xl font-extralight tracking-[0.15em] uppercase mb-4 drop-shadow-2xl">
            EXQUISITE
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/60 ml-1">
            The New Standard of Living
          </p>
          <div className="mt-16 flex flex-wrap gap-4">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="bg-white/5 backdrop-blur-lg border border-white/20 px-6 py-2 text-[9px] uppercase tracking-[0.2em] rounded-full shadow-xl"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Forms */}
      <div className="w-full md:w-[55%] flex flex-col justify-center items-center relative bg-white border-l border-zinc-100 overflow-y-auto min-h-svh">
        <div className="w-full max-w-md px-10 py-12">
          <div className="mb-14 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-green-600 mb-3 block">
              {isLogin ? 'Authentication' : 'Registration'}
            </span>
            <h1 className="text-4xl font-serif italic tracking-tight text-zinc-900">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
          </div>

          <div className="relative">
            {/* LOGIN FORM */}
            <div
              className={`transition-all duration-500 ${isLogin ? 'opacity-100 translate-y-0 relative z-10' : 'opacity-0 translate-y-4 pointer-events-none absolute inset-0'}`}
            >
              <form className="space-y-10" onSubmit={onLoginSubmit}>
                <FloatingInput
                  id="login-email"
                  label="Email or Phone"
                  type="text"
                  value={loginEmailOrPhone}
                  onChange={setLoginEmailOrPhone}
                  onBlur={() => markLoginTouched('emailOrPhone')}
                  error={loginTouched.emailOrPhone ? loginErrors.emailOrPhone : undefined}
                />

                <div className="relative">
                  <FloatingInput
                    id="login-pass"
                    label="Password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={setLoginPassword}
                    onBlur={() => markLoginTouched('password')}
                    error={loginTouched.password ? loginErrors.password : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-0 bottom-3 text-zinc-400 hover:text-green-600 transition-colors"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <Eye size={16} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                  <label className="flex items-center gap-3 cursor-pointer text-zinc-500 hover:text-green-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 border-zinc-300 accent-green-600 rounded-none"
                    />
                    Keep me logged in
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot')}
                    className="text-zinc-400 hover:text-green-600 border-b border-transparent hover:border-green-600 transition-all pb-0.5"
                  >
                    Forgot Password?
                  </button>
                </div>

                {loginError && (
                  <div className="text-[10px] uppercase tracking-widest font-bold text-red-500 text-center">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading || loginCooldownSec !== null}
                  className="w-full bg-green-500 text-white py-5 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-green-600 transition-all flex justify-center items-center group active:scale-[0.98] shadow-lg shadow-green-100 disabled:opacity-50"
                >
                  {loginLoading
                    ? 'Processing...'
                    : loginCooldownSec
                      ? `Retry in ${loginCooldownSec}s`
                      : 'Secure Sign In'}
                  <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="text-center mt-12">
                <p className="text-zinc-400 text-[11px] uppercase tracking-widest font-medium">
                  New to Zeni?
                  <button
                    onClick={() => handleModeChange('register')}
                    className="text-green-600 font-bold ml-2 hover:underline underline-offset-4 decoration-2"
                  >
                    Request Membership
                  </button>
                </p>
              </div>
            </div>

            {/* REGISTER FORM */}
            <div
              className={`transition-all duration-500 ${!isLogin ? 'opacity-100 translate-y-0 relative z-10' : 'opacity-0 translate-y-4 pointer-events-none absolute inset-0'}`}
            >
              <form className="space-y-8" onSubmit={onRegisterSubmit}>
                <FloatingInput
                  id="reg-name"
                  label="Legal Name"
                  type="text"
                  value={registerForm.name}
                  onChange={(v: string) => updateRegisterField('name', v)}
                  onBlur={() => markRegisterTouched('name')}
                  error={registerTouched.name ? registerErrors.name : undefined}
                />
                <FloatingInput
                  id="reg-email"
                  label="Email / Phone"
                  type="text"
                  value={registerForm.emailOrPhone}
                  onChange={(v: string) => updateRegisterField('emailOrPhone', v)}
                  onBlur={() => markRegisterTouched('emailOrPhone')}
                  error={registerTouched.emailOrPhone ? registerErrors.emailOrPhone : undefined}
                />

                <div className="relative">
                  <FloatingInput
                    id="reg-pass"
                    label="Create Password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(v: string) => updateRegisterField('password', v)}
                    onBlur={() => markRegisterTouched('password')}
                    error={registerTouched.password ? registerErrors.password : undefined}
                  />
                  <div className="flex space-x-1 absolute right-0 -top-4">
                    {strengthBars.map((bar, i) => (
                      <div key={i} className={`w-4 h-0.5 ${bar} transition-colors duration-500`} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-0 bottom-3 text-zinc-400 hover:text-green-600 transition-colors"
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    <Eye size={16} strokeWidth={1.5} />
                  </button>
                </div>

                <FloatingInput
                  id="reg-confirm"
                  label="Confirm Password"
                  type="password"
                  value={registerForm.confirm}
                  onChange={(v: string) => updateRegisterField('confirm', v)}
                  onBlur={() => markRegisterTouched('confirm')}
                  error={registerTouched.confirm ? registerErrors.confirm : undefined}
                />

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={registerForm.agree}
                    onChange={(e) => updateRegisterField('agree', e.target.checked)}
                    onBlur={() => markRegisterTouched('agree')}
                    className="mt-1 mr-3 accent-green-600 w-4 h-4 rounded-none"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 leading-relaxed font-bold">
                    Accept{' '}
                    <span className="text-green-600 underline cursor-pointer">Terms & Privacy</span>
                  </span>
                </div>
                {registerTouched.agree && registerErrors.agree && (
                  <p className="text-[9px] text-red-500 uppercase tracking-tighter">
                    {registerErrors.agree}
                  </p>
                )}

                {registerError && (
                  <div className="text-[10px] uppercase tracking-widest font-bold text-red-500 text-center">
                    {registerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full bg-green-500 text-white py-5 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-100 disabled:opacity-50"
                >
                  {registerLoading ? 'Processing...' : 'Register Membership'}
                </button>
              </form>

              <div className="text-center mt-12">
                <p className="text-zinc-400 text-[11px] uppercase tracking-widest font-medium">
                  Already a member?
                  <button
                    onClick={() => handleModeChange('login')}
                    className="text-green-600 font-bold ml-2 hover:underline underline-offset-4 decoration-2"
                  >
                    Return to Login
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Social Sign In */}
          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-[0.4em] bg-white px-6 text-zinc-400 font-bold">
              Or authenticate with
            </div>
          </div>

          <div className="flex justify-center mb-10">
            <GoogleSignInButton
              clientId={GOOGLE_CLIENT_ID}
              onSuccess={handleGoogleSuccess}
              onError={setGoogleError}
              disabled={loginLoading || registerLoading || loginCooldownSec !== null}
            />
          </div>
          {googleError && (
            <p className="text-[10px] text-red-500 text-center uppercase tracking-widest mb-4 font-bold">
              {googleError}
            </p>
          )}

          <div className="text-center text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold">
            Concierge <span className="text-green-600 ml-1">admin@zeni.test</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const FloatingInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
}: FloatingInputProps) => (
  <div className="relative border-b border-zinc-200 focus-within:border-green-500 transition-all duration-500">
    <input
      type={type}
      id={id}
      className="peer w-full py-3 bg-transparent outline-none text-sm text-zinc-900 placeholder-transparent"
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    <label
      htmlFor={id}
      className="absolute left-0 -top-4 text-[9px] uppercase tracking-[0.2em] font-bold text-green-600 transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-placeholder-shown:font-medium peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-zinc-400 peer-focus:-top-4 peer-focus:text-[9px] peer-focus:font-bold peer-focus:tracking-[0.2em] peer-focus:text-green-600"
    >
      {label}
    </label>
    {error && (
      <p
        id={`${id}-error`}
        className="absolute left-0 -bottom-5 text-[9px] text-red-500 uppercase tracking-tighter font-bold"
      >
        {error}
      </p>
    )}
  </div>
);

export default AuthPage;
