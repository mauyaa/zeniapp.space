import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { adminMfaSetup, adminMfaEnable, adminMfaDisable } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';

export function SettingsPage() {
  const { success, error } = useToast();
  const { user, setUserState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const mfaEnabled = Boolean(user?.mfaEnabled);

  const startSetup = async () => {
    setLoading(true);
    setRecoveryCodes(null);
    try {
      const res = await adminMfaSetup();
      setSetupSecret(res.secret);
      setOtpauthUrl(res.otpauthUrl);
      success('MFA setup started. Scan the QR with your authenticator app.');
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    if (!setupSecret || !mfaCode) return;
    setLoading(true);
    try {
      const res = await adminMfaEnable(setupSecret, mfaCode);
      setRecoveryCodes(res.recoveryCodes);
      setUserState(user ? { ...user, mfaEnabled: true } : user);
      localStorage.setItem('auth_user', JSON.stringify({ ...(user || {}), mfaEnabled: true }));
      success('MFA enabled');
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    const code = prompt('Enter your current MFA or recovery code to disable') || '';
    if (!code) return;
    setLoading(true);
    try {
      await adminMfaDisable(code);
      setUserState(user ? { ...user, mfaEnabled: false } : user);
      localStorage.setItem('auth_user', JSON.stringify({ ...(user || {}), mfaEnabled: false }));
      setSetupSecret(null);
      setOtpauthUrl(null);
      setRecoveryCodes(null);
      success('MFA disabled');
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage admin authentication controls and operational security posture.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4 rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black">Admin MFA</div>
              <div className="text-xs text-gray-500">
                Protect sensitive admin actions with TOTP and recovery codes.
              </div>
            </div>
            <span
              className={`rounded-sm px-3 py-1 text-[11px] font-bold uppercase border ${mfaEnabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
            >
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {!mfaEnabled ? (
            <div className="space-y-3">
              {!setupSecret ? (
                <Button
                  size="sm"
                  variant="admin-primary"
                  loading={loading}
                  onClick={startSetup}
                  className="rounded-sm"
                >
                  Start MFA setup
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div className="text-xs text-gray-600">
                    Scan QR with Google Authenticator, 1Password, or Authy.
                  </div>
                  {otpauthUrl && (
                    <img
                      alt="MFA QR"
                      className="h-40 w-40 rounded-lg border border-gray-200 bg-white p-2"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`}
                    />
                  )}
                  <div className="text-xs text-gray-500 font-mono">Secret: {setupSecret}</div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Enter the 6-digit code
                    </label>
                    <input
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
                      placeholder="123456"
                    />
                    <Button
                      size="sm"
                      variant="admin-primary"
                      loading={loading}
                      onClick={completeSetup}
                      className="rounded-sm"
                    >
                      Confirm and enable
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                MFA is active. Keep recovery codes secure. A valid code is required to disable MFA.
              </div>
              <Button size="sm" variant="danger" loading={loading} onClick={disableMfa}>
                Disable MFA
              </Button>
            </div>
          )}

          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <div className="text-xs font-semibold text-green-800">Save these recovery codes</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono text-green-700">
                {recoveryCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded-sm bg-white border border-green-200 px-2 py-1"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-sm font-semibold text-black">Security posture</div>
          <div className="text-xs text-gray-500">Key controls for hardened admin operations.</div>
          <ul className="space-y-2 text-xs text-gray-700">
            <li className="rounded-sm border border-gray-200 bg-gray-50/50 px-3 py-2">
              Step-up protection for privileged actions
            </li>
            <li className="rounded-sm border border-gray-200 bg-gray-50/50 px-3 py-2">
              Audit logging enabled
            </li>
            <li className="rounded-sm border border-gray-200 bg-gray-50/50 px-3 py-2">
              Rate-limit monitoring active
            </li>
          </ul>
          <Button size="sm" variant="admin-primary" className="rounded-sm">
            Rotate API keys
          </Button>
        </div>
      </div>
    </div>
  );
}
