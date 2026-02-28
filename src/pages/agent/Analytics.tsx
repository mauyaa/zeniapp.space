import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock3, Eye, MessageCircle, RefreshCw, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { fetchAgentStats } from '../../lib/api';
import type { AgentStats } from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';

type Period = '7d' | '30d' | '90d' | '12m';

const periods: { key: Period; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
];

const pipelineColors: Record<string, string> = {
  New: 'bg-slate-900',
  Contacted: 'bg-blue-600',
  Viewing: 'bg-amber-500',
  Offer: 'bg-emerald-600',
  Closed: 'bg-violet-600',
};

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchAgentStats()
      .then(setStats)
      .catch((err) => {
        logger.error('Failed to load analytics', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      })
      .finally(() => setLoading(false));
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  const pipeline = stats?.pipeline ?? [];
  const trend = stats?.trend ?? [];
  const totalPipeline = pipeline.reduce((s, p) => s + p.count, 0);
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);
  const maxPipeline = Math.max(...pipeline.map((p) => p.count), 1);

  const leadToViewing = stats?.insights?.find((i) => i.label.startsWith('Lead → Viewing'));
  const viewingToOffer = stats?.insights?.find((i) => i.label.startsWith('Viewing → Offer'));

  const metrics = [
    {
      label: 'New leads (7d)',
      value: stats?.kpis?.find((k) => k.label === 'New Leads')?.value ?? '—',
      delta: null as string | null,
      positive: true,
      icon: UserCheck,
    },
    {
      label: 'Pending viewings',
      value: stats?.kpis?.find((k) => k.label === 'Pending Viewings')?.value ?? '—',
      delta: null,
      positive: true,
      icon: Eye,
    },
    {
      label: 'Conversations',
      value: typeof stats?.conversations === 'number' ? String(stats.conversations) : '—',
      delta: null,
      positive: true,
      icon: MessageCircle,
    },
    {
      label: 'Lead → Viewing',
      value: leadToViewing?.value ?? '—',
      delta: leadToViewing?.hint ?? null,
      positive: true,
      icon: Clock3,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-black mb-2">Performance intelligence</h1>
          <p className="text-sm text-gray-500">
            Real-time lead pipeline, viewings, and conversion from your activity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} leftIcon={<RefreshCw className={loading ? 'animate-spin' : ''} />}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Viewings</div>
          <div className="text-2xl font-semibold text-black mt-1">{typeof stats?.viewings === 'number' ? stats.viewings : '—'}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lead → Viewing</div>
          <div className="text-2xl font-semibold text-black mt-1">{leadToViewing?.value ?? '—'}</div>
          {leadToViewing?.hint && <div className="text-xs text-gray-500 mt-0.5">{leadToViewing.hint}</div>}
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Viewing → Offer</div>
          <div className="text-2xl font-semibold text-black mt-1">{viewingToOffer?.value ?? '—'}</div>
          {viewingToOffer?.hint && <div className="text-xs text-gray-500 mt-0.5">{viewingToOffer.hint}</div>}
        </div>
      </div>

      {/* Period selector (visual only; data is always last 12m for trend) */}
      <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-sm w-fit">
        <Calendar className="w-3.5 h-3.5 text-gray-400 ml-2 mr-1" />
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={cn(
              'px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
              period === p.key
                ? 'bg-white text-black shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 border border-transparent'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-sm border border-gray-200 bg-white shadow-sm p-4 animate-pulse">
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-sm border border-gray-200 bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</div>
                      <div className="mt-1 text-2xl font-semibold text-black">{item.value}</div>
                      {item.delta && (
                        <div className="mt-1.5 text-xs text-gray-500">
                          {item.delta}
                        </div>
                      )}
                    </div>
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-gray-100 text-gray-600 flex-shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {/* Monthly trend chart — real data */}
            <div className="lg:col-span-3 rounded-sm border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Momentum</div>
                  <div className="text-base font-semibold text-black">New leads by month (last 12 months)</div>
                </div>
                <span className="text-xs font-semibold text-gray-500">Real-time</span>
              </div>

              {trend.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  No lead activity in the last 12 months yet.
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex flex-col justify-between text-[10px] text-gray-400 tabular-nums py-0.5" style={{ height: '150px' }}>
                    <span>{maxTrend}</span>
                    <span>{Math.round(maxTrend / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-1.5 items-end" style={{ height: '150px' }}>
                    {trend.map((t, idx) => {
                      const height = Math.max(8, Math.round((t.count / maxTrend) * 140));
                      const isLatest = idx === trend.length - 1;
                      return (
                        <div key={t.month} className="flex flex-col items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-500 tabular-nums">{t.count}</span>
                          <div
                            className={cn(
                              'w-full rounded-t transition-all',
                              isLatest ? 'bg-green-600' : 'bg-gray-300'
                            )}
                            style={{ height: `${height}px` }}
                            title={`${t.label}: ${t.count} leads`}
                          />
                          <span className="text-[9px] uppercase tracking-wide text-gray-400">{t.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline breakdown — real data */}
            <div className="lg:col-span-2 rounded-sm border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pipeline health</div>
                  <div className="text-base font-semibold text-black">Current funnel</div>
                </div>
                <span className="text-xs font-semibold text-gray-500">{totalPipeline} total</span>
              </div>

              {pipeline.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">No pipeline data yet.</div>
              ) : (
                <>
                  <div className="flex rounded-sm overflow-hidden h-3 mb-5">
                    {pipeline.filter((p) => p.count > 0).map((item) => (
                      <div
                        key={item.stage}
                        className={cn(pipelineColors[item.stage] || 'bg-gray-400', 'transition-all')}
                        style={{ width: `${totalPipeline > 0 ? (item.count / totalPipeline) * 100 : 0}%` }}
                        title={`${item.stage}: ${item.count}`}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    {pipeline.map((item) => (
                      <div key={item.stage}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2.5 w-2.5 rounded-full', pipelineColors[item.stage] || 'bg-gray-400')} />
                            <span className="text-gray-700 font-medium">{item.stage}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              {totalPipeline > 0 ? `${Math.round((item.count / totalPipeline) * 100)}%` : '0%'}
                            </span>
                            <span className="font-bold text-black w-6 text-right tabular-nums">{item.count}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div
                            className={cn('h-1.5 rounded-full transition-all', pipelineColors[item.stage] || 'bg-gray-400')}
                            style={{ width: `${maxPipeline > 0 ? Math.round((item.count / maxPipeline) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
