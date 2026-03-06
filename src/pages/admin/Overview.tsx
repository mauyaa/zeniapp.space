import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  ListChecks,
  ShieldCheck,
  UserCheck,
  Users2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fetchAnalytics } from '../../lib/api';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';

export function OverviewPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { push } = useToast();
  const [stats, setStats] = useState({
    pendingAgents: 0,
    reportsToday: 0,
    listings: 0,
    users: 0,
  });

  const [rateMetrics, setRateMetrics] = useState<Record<string, number>>({
    admin_api: 0,
    pay_initiate: 0,
  });

  const loadStats = () => {
    fetchAnalytics()
      .then((data) =>
        setStats({
          pendingAgents: Number(data.pendingAgents) || 0,
          reportsToday: Number(data.reportsToday) || 0,
          listings: Number(data.totalListings ?? data.listings) || 0,
          users: Number(data.totalUsers ?? data.users) || 0,
        })
      )
      .catch((err) => {
        logger.error('Failed to load analytics', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      });
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only
  }, []);

  useEffect(() => {
    api
      .rateMetrics()
      .then((res) => setRateMetrics(res.limits || {}))
      .catch(() => setRateMetrics({}));
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socket.on('user:created', loadStats);
    return () => {
      socket.off('user:created', loadStats);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadStats intentionally not in deps to avoid re-subscribing
  }, [token]);

  const riskSignal = useMemo(() => {
    if (stats.reportsToday > 25)
      return { label: 'High', tone: 'text-rose-300', bg: 'bg-rose-500/20', icon: AlertTriangle };
    if (stats.reportsToday > 10)
      return { label: 'Elevated', tone: 'text-amber-300', bg: 'bg-amber-500/20', icon: Activity };
    return {
      label: 'Normal',
      tone: 'text-emerald-300',
      bg: 'bg-emerald-500/20',
      icon: ShieldCheck,
    };
  }, [stats.reportsToday]);

  const RiskIcon = riskSignal.icon;

  const metricCards = [
    {
      label: 'Pending verifications',
      value: stats.pendingAgents,
      icon: UserCheck,
      iconBg: 'bg-amber-500/20 text-amber-300',
      urgent: stats.pendingAgents > 0,
    },
    {
      label: 'Reports today',
      value: stats.reportsToday,
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/20 text-rose-300',
      urgent: stats.reportsToday > 10,
    },
    {
      label: 'Total users',
      value: stats.users,
      icon: Users2,
      iconBg: 'bg-emerald-500/20 text-emerald-300',
      urgent: false,
    },
    {
      label: 'Total listings',
      value: stats.listings,
      icon: ListChecks,
      iconBg: 'bg-blue-500/20 text-blue-300',
      urgent: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Overview</h1>
        <p className="text-sm text-gray-500">
          Monitor platform health, verification queues, risk indicators, and daily activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          const iconBgLight = m.iconBg.includes('amber')
            ? 'bg-amber-100 text-amber-700'
            : m.iconBg.includes('rose')
              ? 'bg-rose-100 text-rose-700'
              : m.iconBg.includes('emerald')
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700';
          return (
            <div
              key={m.label}
              className={`rounded-sm border p-6 shadow-sm ${
                m.urgent ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-sm ${iconBgLight}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {m.urgent && (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {m.label}
              </div>
              <div className="text-2xl font-semibold text-black mt-1">{m.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Verify agents',
            icon: CheckCircle2,
            to: '/admin/verification',
            desc: `${stats.pendingAgents} pending`,
          },
          {
            label: 'Manage users',
            icon: Users2,
            to: '/admin/users',
            desc: `${stats.users} accounts`,
          },
          {
            label: 'Review listings',
            icon: ListChecks,
            to: '/admin/listings',
            desc: 'Pending approvals',
          },
          {
            label: 'View reports',
            icon: FileText,
            to: '/admin/reports',
            desc: `${stats.reportsToday} today`,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 rounded-sm border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gray-100 text-gray-600 group-hover:text-black transition-colors flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black">{item.label}</p>
                <p className="text-[11px] text-gray-500">{item.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Traffic health
              </div>
              <div className="text-base font-semibold text-black">Rate-limit telemetry</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live counters
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(rateMetrics).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {k.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold text-black mt-0.5">{v}</div>
                </div>
                <div
                  className={`h-8 w-8 rounded-sm flex items-center justify-center ${v > 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                >
                  {v > 50 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
              </div>
            ))}
            {Object.keys(rateMetrics).length === 0 && (
              <div className="text-gray-500 text-sm col-span-2">No rate-limit hits recorded.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
            Risk status
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-sm ${riskSignal.bg.replace('bg-rose-500/20', 'bg-red-100').replace('bg-amber-500/20', 'bg-amber-100').replace('bg-emerald-500/20', 'bg-green-100')} ${riskSignal.tone.replace('text-rose-300', 'text-red-600').replace('text-amber-300', 'text-amber-600').replace('text-emerald-300', 'text-green-600')}`}
            >
              <RiskIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Current signal</div>
              <div
                className={`text-lg font-semibold ${riskSignal.tone.replace('text-rose-300', 'text-red-600').replace('text-amber-300', 'text-amber-600').replace('text-emerald-300', 'text-green-600')}`}
              >
                {riskSignal.label}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Reports today</span>
              <span className="text-black font-semibold">{stats.reportsToday}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(8, stats.reportsToday * 3))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>0 — Normal</span>
              <span>10 — Elevated</span>
              <span>25+ — High</span>
            </div>
          </div>

          <Button
            size="sm"
            variant="admin-primary"
            className="w-full mt-4 rounded-sm"
            onClick={() => navigate('/admin/reports')}
          >
            View reports
          </Button>
        </div>
      </div>
    </div>
  );
}
