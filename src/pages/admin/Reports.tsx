import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileBarChart2, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchAdminReports, resolveReport, downloadReportsCsv } from '../../lib/api';
import type { AdminReport } from '../../types/api';
import { useAdminStepUp } from '../../context/AdminStepUpContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors, success } from '../../constants/messages';

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const { runWithStepUp } = useAdminStepUp();
  const { push } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params: Parameters<typeof fetchAdminReports>[0] = {};
    if (filter !== 'all') params.status = filter;
    if (category) params.category = category;
    if (severity) params.severity = severity;
    fetchAdminReports(Object.keys(params).length > 0 ? params : undefined)
      .then(setReports)
      .catch((err) => {
        logger.error('Failed to load reports', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, [filter, category, severity, push]);

  useEffect(() => {
    load();
  }, [load]);

  const openCount = reports.filter((r) => r.status === 'open').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  const handleExport = () => {
    setExporting(true);
    runWithStepUp(() => downloadReportsCsv())
      .then(() => {
        push({ title: 'Export complete', description: success.generic, tone: 'success' });
      })
      .catch((err) => {
        logger.error('Reports export failed', {}, err instanceof Error ? err : undefined);
        push({
          title: 'Export failed',
          description: err?.message || errors.generic,
          tone: 'error',
        });
      })
      .finally(() => setExporting(false));
  };

  const handleResolve = (id: string, action: 'resolve' | 'ignore' | 'escalate' | 'ban') => {
    setResolvingId(id);
    resolveReport(id, action)
      .then((updated) => {
        setReports((prev) => prev.map((r) => (r._id === id ? updated : r)));
        push({ title: 'Report updated', description: success.generic, tone: 'success' });
      })
      .catch((err) => {
        logger.error(
          'Resolve report failed',
          { id, action },
          err instanceof Error ? err : undefined
        );
        push({ title: 'Update failed', description: errors.generic, tone: 'error' });
      })
      .finally(() => setResolvingId(null));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-black mb-2">Reports</h1>
          <p className="text-sm text-gray-500">
            Review and resolve user reports; export activity for audit.
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          size="sm"
          variant="admin-primary"
          className="h-9 px-4 text-xs font-medium rounded-sm shadow-sm"
          leftIcon={
            exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )
          }
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Open reports
          </div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-amber-700">
            <ShieldAlert className="h-5 w-5" /> {loading ? '--' : openCount}
          </div>
          <div className="mt-1 text-xs text-gray-500">Awaiting review</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Resolved
          </div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-green-700">
            <CheckCircle className="h-5 w-5" /> {loading ? '--' : resolvedCount}
          </div>
          <div className="mt-1 text-xs text-gray-500">Total in list</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <FileBarChart2 className="h-5 w-5" /> {loading ? '--' : reports.length}
          </div>
          <div className="mt-1 text-xs text-gray-500">In current view</div>
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Report list
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'open', 'resolved'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border ${
                  filter === f
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-sm border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-black focus:outline-none"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              <option value="scam">Scam</option>
              <option value="abuse">Abuse</option>
              <option value="duplicates">Duplicates</option>
              <option value="spam">Spam</option>
              <option value="other">Other</option>
            </select>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-sm border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-black focus:outline-none"
              aria-label="Filter by severity"
            >
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12">
            <EmptyState
              variant="light"
              title="No reports"
              subtitle={
                filter === 'all' ? 'No reports in the system yet.' : `No ${filter} reports.`
              }
              action={{ label: 'Refresh', onClick: load }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r._id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-gray-700">{r.targetType}</span>
                      <span className="ml-1 text-gray-500">#{r.targetId?.slice(-6)}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{r.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${r.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' : r.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${r.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '--'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {r.status === 'open' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={resolvingId === r._id}
                            onClick={() => handleResolve(r._id, 'resolve')}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={resolvingId === r._id}
                            onClick={() => handleResolve(r._id, 'ignore')}
                          >
                            Ignore
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
