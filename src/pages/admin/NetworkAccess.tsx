import React, { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../constants/messages';
import { logger } from '../../lib/logger';
import { fetchNetworkAccessStatus } from '../../lib/api';
import type { AdminNetworkAccessStatus, NetworkAccessDecision } from '../../types/api';

const reasonLabel: Record<string, string> = {
  allowed: 'Allowed',
  test_bypass: 'Bypassed in tests',
  ip_missing: 'Missing source IP',
  ip_not_allowed: 'IP not on allowlist',
  tailnet_required: 'Tailnet required'
};

const surfaceLabel: Record<string, string> = {
  admin: 'Admin',
  pay_admin: 'Pay Admin'
};

function renderReason(reason?: string) {
  if (!reason) return 'Unknown';
  return reasonLabel[reason] || reason;
}

function renderSurface(surface?: string) {
  if (!surface) return 'Unknown';
  return surfaceLabel[surface] || surface;
}

function DecisionRow({ row }: { row: NetworkAccessDecision }) {
  const allowed = row.action === 'network_access_allowed';
  return (
    <div className="grid gap-3 border-b border-gray-100 py-3 px-6 text-sm hover:bg-gray-50 transition-colors md:grid-cols-[140px_110px_180px_1fr_130px] min-w-[640px]">
      <div className="flex items-center">
        <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${allowed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {allowed ? 'Allowed' : 'Denied'}
        </span>
      </div>
      <div className="text-gray-600">{renderSurface(row.surface)}</div>
      <div className="font-mono text-xs text-gray-500">{row.sourceIp || 'n/a'}</div>
      <div className="truncate text-gray-500">
        {renderReason(row.reason)}
        {row.path ? <span className="ml-2 text-gray-400">({row.path})</span> : null}
      </div>
      <div className="text-xs text-gray-500">{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</div>
    </div>
  );
}

export function NetworkAccessPage() {
  const [data, setData] = useState<AdminNetworkAccessStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNetworkAccessStatus();
      setData(res);
    } catch (err) {
      logger.error('Failed to load network access status', {}, err instanceof Error ? err : undefined);
      push({ title: 'Load failed', description: errors.generic, tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const adminEnforced = Boolean(data?.policy.enforcement.adminTailnetRequired);
  const payAdminEnforced = Boolean(data?.policy.enforcement.payAdminTailnetRequired);
  const decisions = data?.recentDecisions || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-black mb-2">Network Access</h1>
          <p className="text-sm text-gray-500">Read-only visibility into privileged route network controls and access decisions.</p>
        </div>
        <Button variant="admin-primary" size="sm" onClick={() => void load()} loading={loading} className="h-9 px-4 text-xs font-medium rounded-sm shadow-sm">
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Policy snapshot
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Admin tailnet enforcement</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${adminEnforced ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {adminEnforced ? 'ON' : 'OFF'}
                </span>
                <span className="text-sm text-gray-600">{adminEnforced ? 'Only tailnet IPs allowed' : 'Tailnet optional'}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pay-admin tailnet enforcement</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${payAdminEnforced ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {payAdminEnforced ? 'ON' : 'OFF'}
                </span>
                <span className="text-sm text-gray-600">{payAdminEnforced ? 'Only tailnet IPs allowed' : 'Tailnet optional'}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Admin IP allowlist mode</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${data?.policy.adminIpAllowlist.mode === 'restricted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {(data?.policy.adminIpAllowlist.mode || 'open').toUpperCase()}
                </span>
                <span className="text-sm text-gray-600">{(data?.policy.adminIpAllowlist.entries || []).length} entries</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Policy loaded</div>
              <div className="mt-2 text-sm text-gray-700">
                {data?.policy.loadedAt ? new Date(data.policy.loadedAt).toLocaleString() : 'n/a'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Current request
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Source IP</div>
              <div className="mt-1 text-sm font-mono text-gray-700">{data?.request.sourceIp || 'n/a'}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Tailnet detected</div>
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${data?.request.tailnetDetected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {data?.request.tailnetDetected ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Admin access decision</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${data?.request.admin.allowed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {data?.request.admin.allowed ? 'ALLOWED' : 'DENIED'}
                </span>
                <span className="text-xs text-gray-500">{renderReason(data?.request.admin.reason)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pay-admin access decision</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${data?.request.payAdmin.allowed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {data?.request.payAdmin.allowed ? 'ALLOWED' : 'DENIED'}
                </span>
                <span className="text-xs text-gray-500">{renderReason(data?.request.payAdmin.reason)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 min-w-[640px]">
          Recent network access decisions
        </div>
        {decisions.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-500">No network-access decisions logged yet.</div>
        ) : (
          <div className="min-w-[640px]">
            {decisions.map((row) => (
              <DecisionRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
