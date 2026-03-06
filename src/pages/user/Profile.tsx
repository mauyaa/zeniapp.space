import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MonitorSmartphone,
  RefreshCcw,
  ShieldCheck,
  User,
  XCircle,
  LogOut,
  Wallet,
  Bookmark,
  MessageSquare,
  Shield,
  Fingerprint,
  CloudUpload,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatsBar } from '../../components/ui/StatsBar';
import { useAuth } from '../../context/AuthProvider';
import { useI18n } from '../../context/I18nContext';
import { api, submitKyc, getKycStatus, uploadImage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { cn } from '../../utils/cn';
import {
  KYC_POLICY,
  KYC_ACCEPTANCE_CRITERIA,
  KYC_REQUIRED_LABEL,
} from '../../constants/verification';

type Session = {
  _id: string;
  userAgent?: string;
  ip?: string;
  createdAt?: string;
  lastUsedAt?: string;
  stepUpVerifiedAt?: string;
};

type ProfileTab = 'overview' | 'sessions' | 'security';

const profileTabs: { key: ProfileTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'sessions', label: 'Sessions', icon: MonitorSmartphone },
  { key: 'security', label: 'Security', icon: Shield },
];

export function ProfilePage() {
  const { user, logout, setUserState } = useAuth();
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { push } = useToast();
  const userId = user?.id || 'unknown';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  const [kycEvidence, setKycEvidence] = useState<
    { url: string; note?: string; uploadedAt?: string }[]
  >([]);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycNote, setKycNote] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await api.listAuthSessions();
      setSessions(data.sessions || []);
    } catch (e) {
      logger.warn('Failed to load sessions', { error: e as Error });
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    getKycStatus()
      .then((d) => {
        setKycStatus(d.status as 'none' | 'pending' | 'verified' | 'rejected');
        setKycEvidence(d.evidence || []);
      })
      .catch((e) => logger.warn('Failed to load kyc status', { error: e as Error }));
  }, []);

  useEffect(() => {
    if (searchParams.get('kyc') === 'required') {
      document.getElementById('kyc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const latestSession = useMemo(() => {
    if (!sessions.length) return null;
    return [...sessions].sort((a, b) => {
      const aTs = a.lastUsedAt || a.createdAt || '';
      const bTs = b.lastUsedAt || b.createdAt || '';
      return (bTs ? new Date(bTs).getTime() : 0) - (aTs ? new Date(aTs).getTime() : 0);
    })[0];
  }, [sessions]);

  const revoke = async (id: string) => {
    await api.revokeAuthSession(id);
    setSessions((prev) => prev.filter((s) => s._id !== id));
  };

  const revokeAll = async () => {
    setRevokingAll(true);
    try {
      await api.revokeAllAuthSessions();
      setSessions([]);
      logout();
    } finally {
      setRevokingAll(false);
    }
  };

  const parseDevice = (ua?: string) => {
    if (!ua) return { name: 'Unknown device', type: 'desktop' };
    const isMobile = /mobile|android|iphone/i.test(ua);
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || 'Browser';
    const os = ua.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[1] || '';
    return {
      name: `${browser}${os ? ` on ${os}` : ''}`,
      type: isMobile ? 'mobile' : 'desktop',
    };
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      push({
        title: 'Invalid image',
        description: 'Please select a valid image file.',
        tone: 'error',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      push({
        title: 'File too large',
        description: 'Avatar must be less than 5MB.',
        tone: 'error',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      push({ title: 'Uploading', description: 'Uploading your new profile picture...' });
      const { url } = await uploadImage(file);
      const res = await api.updateAvatar(url);

      // Update global auth user state to reflect new avatar
      if (user) {
        setUserState({ ...user, avatarUrl: res.avatarUrl });
      }

      push({
        title: 'Success',
        description: 'Profile picture updated successfully',
        tone: 'success',
      });
    } catch (err) {
      logger.error('Failed to upload avatar', { error: err as Error });
      push({ title: 'Failed', description: 'Could not upload profile picture.', tone: 'error' });
    } finally {
      setUploadingAvatar(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <SectionHeader
        eyebrow="Account"
        title="Profile & security"
        subtitle="Manage your identity, active sessions, and account security controls."
      >
        <StatsBar
          variant="zeni"
          loading={loadingSessions}
          items={[
            { label: 'Role', value: user?.role || 'user' },
            { label: 'Sessions', value: String(sessions.length) },
            {
              label: 'Last active',
              value: latestSession?.lastUsedAt
                ? new Date(latestSession.lastUsedAt).toLocaleDateString()
                : '--',
            },
          ]}
        />
      </SectionHeader>

      {/* Tab navigation */}
      <div
        className="flex items-center gap-1 p-1 bg-zinc-50 border border-zinc-200 rounded-xl w-fit"
        role="tablist"
      >
        {profileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 border border-transparent'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Identity card */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <label
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-xl text-white text-xl font-serif shrink-0 overflow-hidden group cursor-pointer',
                  !user?.avatarUrl && 'bg-green-500',
                  uploadingAvatar && 'opacity-50 pointer-events-none'
                )}
                title="Change profile picture"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                )}

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CloudUpload className="w-5 h-5 text-white" />
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
              <div>
                <h2 className="text-lg font-serif font-semibold text-zinc-900">
                  {user?.name || 'User'}
                </h2>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
                <div
                  className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50"
                  role="group"
                  aria-label="Language"
                >
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${locale === 'en' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale('sw')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${locale === 'sw' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    SW
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-zinc-50 rounded-lg px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  Account ID
                </p>
                <p className="text-sm font-mono text-zinc-700 break-all">{userId}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  Role
                </p>
                <p className="text-sm font-semibold text-zinc-700 capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
            </div>
          </div>

          {/* KYC / Identity verification */}
          <div id="kyc" className="bg-white border border-zinc-200 rounded-xl p-6 scroll-mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-semibold text-zinc-900">
                  Verify my identity (KYC)
                </h2>
                <p className="text-xs text-zinc-500 mt-1">{KYC_REQUIRED_LABEL}</p>
              </div>
              <div className="ml-auto">
                <span
                  className={cn(
                    'inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                    kycStatus === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                    kycStatus === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                    kycStatus === 'rejected' && 'bg-rose-50 text-rose-700 border-rose-200',
                    kycStatus === 'none' && 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  )}
                >
                  {kycStatus === 'none' ? 'Not submitted' : kycStatus}
                </span>
              </div>
            </div>
            <div className="mb-4 rounded-lg bg-zinc-50 border border-zinc-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                When verification is required
              </p>
              <ul className="text-xs text-zinc-700 space-y-1">
                {KYC_POLICY.requiredFor.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-3 mb-2">
                Not required for
              </p>
              <ul className="text-xs text-zinc-600 space-y-1">
                {KYC_POLICY.notRequiredFor.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-4 rounded-lg border border-zinc-200 p-3 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Documents we accept
              </p>
              <ul className="text-xs text-zinc-600 space-y-1">
                {KYC_ACCEPTANCE_CRITERIA.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5" aria-hidden>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {(kycStatus === 'none' || kycStatus === 'rejected') && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!kycFile) {
                    push({
                      title: 'Select a file',
                      description: 'Upload an ID image',
                      tone: 'error',
                    });
                    return;
                  }
                  const maxSize = 5 * 1024 * 1024; // 5MB
                  if (kycFile.size > maxSize) {
                    push({
                      title: 'File too large',
                      description: 'KYC documents must be 5MB or smaller. Use a smaller image.',
                      tone: 'error',
                    });
                    return;
                  }
                  if (!/^image\/(jpeg|png|webp|gif)$/i.test(kycFile.type)) {
                    push({
                      title: 'Invalid file type',
                      description: 'Use JPEG, PNG, WebP or GIF for ID documents.',
                      tone: 'error',
                    });
                    return;
                  }
                  setKycSubmitting(true);
                  try {
                    const { url } = await uploadImage(kycFile);
                    await submitKyc(url, kycNote || undefined);
                    push({
                      title: 'Submitted',
                      description: 'KYC documents sent for review',
                      tone: 'success',
                    });
                    setKycFile(null);
                    setKycNote('');
                    const d = await getKycStatus();
                    setKycStatus(d.status as 'none' | 'pending' | 'verified' | 'rejected');
                    setKycEvidence(d.evidence || []);
                  } catch (err) {
                    push({
                      title: 'Failed',
                      description: err instanceof Error ? err.message : 'Could not submit',
                      tone: 'error',
                    });
                  } finally {
                    setKycSubmitting(false);
                  }
                }}
                className="space-y-3"
              >
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 min-h-[120px] text-center text-sm text-zinc-600 hover:border-amber-400 hover:text-amber-700 transition-colors touch-manipulation">
                  <CloudUpload className="mb-2 h-6 w-6" />
                  <span>{kycFile ? kycFile.name : 'Tap to select an ID image (max 5MB)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={kycNote}
                  onChange={(e) => setKycNote(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  type="submit"
                  disabled={kycSubmitting}
                  leftIcon={<FileText className="h-4 w-4" />}
                >
                  {kycSubmitting ? 'Submitting…' : 'Submit for verification'}
                </Button>
              </form>
            )}
            {kycEvidence.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  Submitted documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {kycEvidence.map((ev, idx) => (
                    <a
                      key={idx}
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-amber-300"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {ev.note || 'Document'}{' '}
                      {ev.uploadedAt ? `— ${new Date(ev.uploadedAt).toLocaleDateString()}` : ''}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick navigation */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Saved listings',
                icon: Bookmark,
                to: '/app/saved',
                desc: 'Your saved searches',
              },
              {
                label: 'Messages',
                icon: MessageSquare,
                to: '/app/messages',
                desc: 'Agent conversations',
              },
              { label: 'Payments', icon: Wallet, to: '/pay/login', desc: 'Manage billing' },
              {
                label: 'Refund requests',
                icon: Shield,
                to: '/app/refunds',
                desc: 'Zeni Shield refunds',
              },
              { label: 'Explore', icon: ShieldCheck, to: '/app/explore', desc: 'Find new homes' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-colors flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{item.label}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-serif font-semibold text-zinc-900">Active sessions</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Devices currently logged into your account.
              </p>
            </div>
            <Button
              variant="zeni-secondary"
              size="zeni-sm"
              onClick={loadSessions}
              disabled={loadingSessions}
              loading={loadingSessions}
              loadingText="Refreshing…"
              leftIcon={!loadingSessions ? <RefreshCcw className="w-3.5 h-3.5" /> : undefined}
            >
              Refresh
            </Button>
          </div>

          <div className="divide-y divide-zinc-100">
            {loadingSessions && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg flex-shrink-0" />
                  </div>
                ))}
              </>
            )}
            {!loadingSessions && sessions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                No active sessions found.
              </div>
            )}
            {!loadingSessions &&
              sessions.map((session) => {
                const device = parseDevice(session.userAgent);
                return (
                  <div
                    key={session._id}
                    className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 flex-shrink-0">
                        <MonitorSmartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">
                          {device.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-500">
                            {session.ip || 'IP unavailable'}
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span className="text-xs text-zinc-500">
                            {session.lastUsedAt
                              ? new Date(session.lastUsedAt).toLocaleString()
                              : 'Unknown'}
                          </span>
                        </div>
                        {session.stepUpVerifiedAt && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <Fingerprint className="w-3 h-3" />
                            Step-up verified
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(session._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 flex-shrink-0 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Revoke
                    </button>
                  </div>
                );
              })}
          </div>

          {!loadingSessions && sessions.length > 0 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-100 bg-zinc-50">
              <p className="text-xs text-zinc-500">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={revokeAll}
                disabled={revokingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout all devices
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-semibold text-zinc-900">
                  Security posture
                </h2>
                <p className="text-xs text-zinc-500">Your account security configuration.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Account status', value: 'Active', ok: true },
                {
                  label: 'Session management',
                  value: `${sessions.length} active`,
                  ok: sessions.length <= 5,
                },
                { label: 'Role', value: user?.role || 'user', ok: true },
                {
                  label: 'Last login',
                  value: latestSession?.lastUsedAt
                    ? new Date(latestSession.lastUsedAt).toLocaleString()
                    : 'Unknown',
                  ok: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3"
                >
                  <span className="text-sm text-zinc-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 capitalize">
                      {item.value}
                    </span>
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        item.ok ? 'bg-green-500' : 'bg-amber-500'
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-5">
            <p className="text-xs text-zinc-500">
              Need to change your password or enable two-factor authentication? Contact support or
              use the payment portal security center for payment-related security controls.
            </p>
            <Button
              variant="zeni-secondary"
              size="zeni-sm"
              className="mt-3"
              onClick={() => navigate('/pay/security')}
            >
              Payment security center
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
