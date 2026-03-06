import React, { useEffect, useState } from 'react';
import { payApi, type PaySession } from '../payApi';
import { usePayAuth } from '../PayAuthContext';

const tabs = ['Profile', 'Password', 'Security'] as const;

type PayAccount = {
  status?: 'active' | 'suspended' | string;
  defaultMethod?: 'mpesa_stk' | 'card' | 'bank_transfer' | string;
  defaultCurrency?: 'KES' | 'USD' | string;
};

export function PayProfile() {
  const { user } = usePayAuth();
  const [active, setActive] = useState<(typeof tabs)[number]>('Profile');
  const [sessions, setSessions] = useState<PaySession[]>([]);
  const [message, setMessage] = useState('');
  const [account, setAccount] = useState<PayAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpMessage, setStepUpMessage] = useState('');

  useEffect(() => {
    payApi
      .sessions()
      .then((s) => setSessions(s as PaySession[]))
      .catch(() => setSessions([]));
    payApi
      .getAccount()
      .then((acct) => setAccount(acct as PayAccount | null))
      .catch(() => setAccount(null));
  }, []);

  const handleLogoutAll = async () => {
    setMessage('');
    try {
      await payApi.logoutAll();
      setSessions([]);
      setMessage('All sessions revoked.');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to revoke sessions');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 pay-fade-in">
      <div className="max-w-2xl">
        <div className="rounded-sm border border-zinc-800 bg-[#18181B] p-6 lg:p-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={`rounded-sm px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  active === tab
                    ? 'bg-emerald-500 text-black border border-emerald-500'
                    : 'border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {active === 'Profile' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full name" value={user?.name || ''} />
                  <Input label="Role" value={user?.role || ''} />
                  <div className="sm:col-span-2 rounded-sm border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                    <p className="text-xs text-zinc-400">
                      Email and phone are managed in your main Zeni account. Update them at{' '}
                      <strong>App → Profile</strong>.
                    </p>
                  </div>
                </div>

                {account && (
                  <div className="rounded-sm border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">Wallet defaults</div>
                        <div className="text-xs text-zinc-500">
                          Status: {account.status === 'active' ? 'Active' : 'Suspended'}
                        </div>
                      </div>
                      <span
                        className={`rounded-sm px-3 py-1 text-[10px] font-bold uppercase ${
                          account.status === 'active'
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-900/30 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {account.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                          Default method
                        </label>
                        <select
                          value={account.defaultMethod || 'mpesa_stk'}
                          onChange={(e) =>
                            setAccount((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    defaultMethod: e.target.value as PayAccount['defaultMethod'],
                                  }
                                : prev
                            )
                          }
                          className="w-full rounded-sm border border-zinc-700 bg-black px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="mpesa_stk">M-Pesa STK</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                          Default currency
                        </label>
                        <select
                          value={account.defaultCurrency || 'KES'}
                          onChange={(e) =>
                            setAccount((prev) =>
                              prev ? { ...prev, defaultCurrency: e.target.value } : prev
                            )
                          }
                          className="w-full rounded-sm border border-zinc-700 bg-black px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="KES">KES</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!account) return;
                        setSaving(true);
                        setMessage('');
                        try {
                          const method =
                            account.defaultMethod === 'card' ||
                            account.defaultMethod === 'bank_transfer' ||
                            account.defaultMethod === 'mpesa_stk'
                              ? account.defaultMethod
                              : 'mpesa_stk';
                          const updated = await payApi.updateAccount({
                            defaultCurrency: account.defaultCurrency,
                            defaultMethod: method,
                          });
                          setAccount(updated as PayAccount);
                          setMessage('Wallet defaults saved.');
                        } catch (e: unknown) {
                          setMessage(e instanceof Error ? e.message : 'Save failed');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="mt-4 rounded-sm bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-emerald-400 disabled:opacity-60 transition-colors"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save defaults'}
                    </button>
                    {message && <p className="mt-2 text-xs text-emerald-400">{message}</p>}
                  </div>
                )}
              </div>
            )}

            {active === 'Password' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Pay portal uses the same credentials as your main Zeni account. To change your
                  password, go to <strong>App → Profile → Security</strong> on the main site.
                </p>
              </div>
            )}

            {active === 'Security' && (
              <div className="space-y-4">
                <div className="rounded-sm border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="text-sm font-semibold text-white">Security preferences</div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Step-up verification is required for sensitive actions.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-xs font-semibold text-zinc-300">
                        Two-factor verification
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Enter your step-up code to elevate this session.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={stepUpCode}
                        onChange={(e) => setStepUpCode(e.target.value)}
                        placeholder="Enter code"
                        className="w-28 rounded-sm border border-zinc-700 bg-black px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setStepUpMessage('');
                          try {
                            const res = await payApi.stepUp(stepUpCode);
                            setStepUpMessage(
                              `Verified at ${new Date(res.verifiedAt).toLocaleTimeString()}`
                            );
                            const updated = await payApi.sessions();
                            setSessions(updated);
                          } catch (e: unknown) {
                            setStepUpMessage(e instanceof Error ? e.message : 'Step-up failed');
                          }
                        }}
                        className="rounded-sm border border-zinc-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                  {stepUpMessage && (
                    <div className="mt-2 text-xs text-emerald-400">{stepUpMessage}</div>
                  )}
                </div>

                <div className="rounded-sm border border-zinc-800 bg-[#18181B] p-4">
                  <div className="text-sm font-semibold text-white">Active sessions</div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-400">
                    {sessions.length === 0 && <div>No active sessions found.</div>}
                    {sessions.map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between rounded-sm border border-zinc-800 px-3 py-2"
                      >
                        <div>
                          <div className="font-medium text-zinc-200">
                            {session.userAgent || 'Unknown device'}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Last used{' '}
                            {session.lastUsedAt
                              ? new Date(session.lastUsedAt).toLocaleString()
                              : '--'}
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-500">{session.ip || '--'}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoutAll}
                    className="mt-4 rounded-sm border border-red-900/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    Sign out of all sessions
                  </button>
                  {message && <p className="mt-2 text-xs text-emerald-400">{message}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
        {label}
      </label>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        readOnly
        className="w-full rounded-sm border border-zinc-700 bg-black px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}
