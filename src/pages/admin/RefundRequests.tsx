import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, User, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageTransition } from '../../components/ui/PageTransition';
import { useToast } from '../../context/ToastContext';
import { fetchAdminRefundRequests, resolveRefundRequest, type RefundRequestItem } from '../../lib/api';
import { formatCompactPrice } from '../../lib/format';
import { cn } from '../../utils/cn';
import { trackEvent } from '../../lib/analytics';
import { useAdminStepUp } from '../../context/AdminStepUpContext';

const statusConfig = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock, label: 'Pending' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2, label: 'Approved' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: XCircle, label: 'Rejected' },
};

function getTx(r: RefundRequestItem) {
  const t = r.transactionId;
  if (typeof t === 'object' && t && 'amount' in t) return t as { _id: string; amount: number; currency: string; purpose?: string; referenceId?: string; createdAt?: string };
  return null;
}

function getUser(r: RefundRequestItem) {
  const u = r.userId as unknown;
  if (typeof u === 'object' && u && u !== null && 'name' in u) return (u as { name?: string; emailOrPhone?: string }).name || (u as { emailOrPhone?: string }).emailOrPhone || '—';
  return '—';
}

export function RefundRequestsPage() {
  const { push } = useToast();
  const { runWithStepUp } = useAdminStepUp();
  const [items, setItems] = useState<RefundRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{ id: string; decision: 'approved' | 'rejected'; notes: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAdminRefundRequests(filter === 'pending' ? 'pending' : undefined);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    const { id, decision, notes } = resolveModal;
    setResolvingId(id);
    try {
      await runWithStepUp(() => resolveRefundRequest(id, { decision, adminNotes: notes || undefined }));
      trackEvent({ name: 'refund_resolved', payload: { requestId: id, decision } });
      push({ title: decision === 'approved' ? 'Refund approved' : 'Refund rejected', tone: 'success' });
      setResolveModal(null);
      load();
    } catch (e) {
      push({ title: 'Failed', description: e instanceof Error ? e.message : 'Could not resolve', tone: 'error' });
    } finally {
      setResolvingId(null);
    }
  };

  const pendingCount = items.filter((r) => r.status === 'pending').length;

  return (
    <PageTransition className="space-y-8">
      <SectionHeader
        eyebrow="Zeni Shield"
        title="Refund requests"
        subtitle="Review and approve or reject tenant refund requests. Approving reverses the payment."
        actions={
          <Button variant="zeni-secondary" size="zeni-sm" onClick={load} disabled={loading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-2 p-1 bg-zinc-50 border border-zinc-200 rounded-xl w-fit" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'pending'}
          onClick={() => setFilter('pending')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
            filter === 'pending' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700 border border-transparent'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending
          {pendingCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 text-white px-1.5 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          onClick={() => setFilter('all')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
            filter === 'all' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700 border border-transparent'
          )}
        >
          All
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="light"
          size="lg"
          illustration="file"
          title={filter === 'pending' ? 'No pending refund requests' : 'No refund requests'}
          subtitle={filter === 'pending' ? 'When tenants request refunds they will appear here.' : 'No refund requests have been submitted yet.'}
        />
      ) : (
        <ul className="space-y-4" role="list">
          {items.map((r) => {
            const tx = getTx(r);
            const config = statusConfig[r.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const Icon = config.icon;
            const isPending = r.status === 'pending';
            return (
              <li
                key={r._id}
                className={cn(
                  'bg-white border rounded-2xl p-6 shadow-sm',
                  config.border
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono font-semibold text-zinc-900 text-lg">
                        {tx ? formatCompactPrice(tx.amount, tx.currency) : '—'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-widest', config.border, config.text)}>
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                        {config.label}
                      </span>
                      {tx?.purpose && (
                        <span className="text-xs text-zinc-500 font-mono">{tx.purpose}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-zinc-600 mt-1">
                      <User className="w-4 h-4 text-zinc-400" aria-hidden />
                      {getUser(r)}
                    </div>
                    <p className="mt-3 text-sm text-zinc-700 bg-zinc-50 rounded-lg px-4 py-3 border border-zinc-100">
                      {r.reason}
                    </p>
                    {r.adminNotes && (
                      <p className="mt-2 text-xs text-zinc-500 italic">Your notes: {r.adminNotes}</p>
                    )}
                    <p className="mt-2 text-[10px] text-zinc-400">
                      Request ID: {r._id} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex flex-col gap-2 flex-shrink-0 lg:w-48">
                      <Button
                        variant="zeni-primary"
                        size="zeni-sm"
                        onClick={() => setResolveModal({ id: r._id, decision: 'approved', notes: '' })}
                        disabled={resolvingId === r._id}
                        leftIcon={<CheckCircle2 className="w-3 h-3" />}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="zeni-secondary"
                        size="zeni-sm"
                        onClick={() => setResolveModal({ id: r._id, decision: 'rejected', notes: '' })}
                        disabled={resolvingId === r._id}
                        leftIcon={<XCircle className="w-3 h-3" />}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="resolve-dialog-title" aria-describedby="resolve-dialog-desc">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-zinc-200">
            <h2 id="resolve-dialog-title" className="text-lg font-serif font-semibold text-zinc-900 mb-2">
              {resolveModal.decision === 'approved' ? 'Approve refund' : 'Reject refund'}
            </h2>
            <p id="resolve-dialog-desc" className="text-sm text-zinc-600 mb-4">
              {resolveModal.decision === 'approved'
                ? 'This will reverse the payment. The tenant will be notified.'
                : 'The tenant will be notified. You can add a note for your records.'}
            </p>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={resolveModal.notes}
              onChange={(e) => setResolveModal((m) => m ? { ...m, notes: e.target.value } : null)}
              placeholder="Internal note for this decision"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zeni-foreground focus:outline-none focus:ring-2 focus:ring-zeni-foreground/20 resize-y mb-6"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="zeni-secondary" size="zeni-md" onClick={() => setResolveModal(null)}>
                Cancel
              </Button>
              <Button
                variant="zeni-primary"
                size="zeni-md"
                onClick={handleResolve}
                disabled={resolvingId === resolveModal.id}
              >
                {resolveModal.decision === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
