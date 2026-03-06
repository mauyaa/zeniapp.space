import React, { useCallback, useEffect, useState } from 'react';
import { fetchAuditLogs } from '../../lib/api';
import type { AuditLogEntry } from '../../types/api';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';

export function AuditPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState({ actorId: '', action: '', entityType: '' });
  const { push } = useToast();

  const load = useCallback(() => {
    fetchAuditLogs({
      actorId: filters.actorId || undefined,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      limit: 200,
    })
      .then(setRows)
      .catch((err) => {
        logger.error('Failed to load audit logs', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      });
  }, [filters.actorId, filters.action, filters.entityType, push]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Audit Logs</h1>
        <p className="text-sm text-gray-500">Track sensitive actions across the admin console.</p>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={filters.actorId}
            onChange={(e) => setFilters((prev) => ({ ...prev, actorId: e.target.value }))}
            placeholder="Actor ID"
            className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
          />
          <input
            value={filters.action}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
            placeholder="Action"
            className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
          />
          <input
            value={filters.entityType}
            onChange={(e) => setFilters((prev) => ({ ...prev, entityType: e.target.value }))}
            placeholder="Entity type"
            className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
          />
          <button
            onClick={load}
            className="rounded-sm border border-black bg-black px-3 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-zinc-800 transition-colors"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Log entries
        </div>
        {rows.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">No audit logs yet</div>
        )}
        {rows.map((r) => (
          <div
            key={r._id}
            className="flex items-center justify-between py-4 px-6 border-b border-gray-100 text-sm hover:bg-gray-50 transition-colors last:border-b-0"
          >
            <div className="space-y-1">
              <div className="font-semibold text-black">{r.action}</div>
              <div className="text-xs text-gray-500">
                {r.entityType} #{r.entityId}
              </div>
              <div className="text-[11px] text-gray-500">
                Actor: {r.actorId} ({r.actorRole})
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border bg-gray-100 text-gray-700 border-gray-200">
                Admin
              </span>
              <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
