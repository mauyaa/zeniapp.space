import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageTransition } from '../../components/ui/PageTransition';
import { useToast } from '../../context/ToastContext';
import {
  fetchEligibleTransactions,
  createRefundRequest,
  fetchMyRefundRequests,
  type RefundRequestItem,
  type EligibleTransaction,
} from '../../lib/api';
import { formatCompactPrice } from '../../lib/format';
import { trackEvent } from '../../lib/analytics';
import { cn } from '../../utils/cn';
import { useI18n } from '../../context/I18nContext';

function useStatusConfig(t: (k: string) => string) {
  return {
    pending: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock, label: t('refunds.pending') },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2, label: t('refunds.approved') },
    rejected: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: XCircle, label: t('refunds.rejected') },
  };
}

export function RefundsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { t } = useI18n();
  const statusConfig = useStatusConfig(t);
  const [requests, setRequests] = useState<RefundRequestItem[]>([]);
  const [eligible, setEligible] = useState<EligibleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMyRefundRequests();
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEligible = useCallback(async () => {
    setLoadingEligible(true);
    try {
      const list = await fetchEligibleTransactions();
      setEligible(Array.isArray(list) ? list : []);
    } catch {
      setEligible([]);
    } finally {
      setLoadingEligible(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showForm) loadEligible();
  }, [showForm, loadEligible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxId || !reason.trim() || reason.trim().length < 10) {
      push({ title: 'Invalid request', description: 'Select a payment and give a reason (at least 10 characters).', tone: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await createRefundRequest({ transactionId: selectedTxId, reason: reason.trim() });
      trackEvent({ name: 'refund_requested', payload: { transactionId: selectedTxId, reasonLength: reason.trim().length } });
      push({ title: 'Refund requested', description: 'Zeni Support will review your request.', tone: 'success' });
      setShowForm(false);
      setSelectedTxId('');
      setReason('');
      load();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Request failed';
      push({ title: 'Could not submit', description: m, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getTxFromRequest = (r: RefundRequestItem) => {
    const t = r.transactionId;
    if (typeof t === 'object' && t && 'amount' in t) return t as { _id: string; amount: number; currency: string; purpose?: string; createdAt?: string };
    return null;
  };

  return (
    <PageTransition className="space-y-8">
      <SectionHeader
        eyebrow="Zeni Shield"
        title={t('refunds.title')}
        subtitle={t('refunds.subtitle')}
        actions={
          <Button
            variant="zeni-primary"
            size="zeni-md"
            onClick={() => setShowForm((v) => !v)}
            leftIcon={<Shield className="w-3.5 h-3.5" />}
          >
            {showForm ? t('common.cancel') : t('refunds.requestRefund')}
          </Button>
        }
      />

      {/* Request form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-serif font-semibold text-zinc-900 mb-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-zeni-foreground" aria-hidden />
            New refund request
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Select a payment and explain why you're requesting a refund. Our team will get back to you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Payment to refund
              </label>
              {loadingEligible ? (
                <div className="h-12 rounded-lg bg-zinc-100 animate-pulse" />
              ) : eligible.length === 0 ? (
                <p className="text-sm text-zinc-500 py-3">
                  No eligible payments. Only completed payments that don't already have a refund request can be refunded.
                </p>
              ) : (
                <div className="relative">
                  <select
                    value={selectedTxId}
                    onChange={(e) => setSelectedTxId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white py-3 pl-4 pr-10 text-zinc-900 focus:border-zeni-foreground focus:outline-none focus:ring-2 focus:ring-zeni-foreground/20 appearance-none"
                    aria-label="Select payment"
                  >
                    <option value="">Select a payment</option>
                    {eligible.map((tx) => (
                      <option key={tx._id} value={tx._id}>
                        {formatCompactPrice(tx.amount, tx.currency)} · {tx.purpose || 'Payment'} · {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" aria-hidden />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Reason (min 10 characters)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Viewing was canceled by the agent; deposit returned by landlord."
                rows={4}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zeni-foreground focus:outline-none focus:ring-2 focus:ring-zeni-foreground/20 resize-y"
                aria-label="Reason for refund"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="zeni-primary"
                size="zeni-md"
                disabled={submitting || !selectedTxId || reason.trim().length < 10 || eligible.length === 0}
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </Button>
              <Button type="button" variant="zeni-secondary" size="zeni-md" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* My requests list */}
      <div>
        <h3 className="text-lg font-serif font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-zeni-foreground" aria-hidden />
          {t('refunds.myRequests')}
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            variant="light"
            size="md"
            illustration="file"
            title={t('refunds.noRequests')}
            subtitle={t('refunds.noRequestsHint')}
            action={
              !showForm
                ? { label: t('refunds.requestRefund'), onClick: () => setShowForm(true), variant: 'primary' as const }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-3" role="list">
            {requests.map((r) => {
              const tx = getTxFromRequest(r);
              const config = statusConfig[r.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const Icon = config.icon;
              return (
                <li
                  key={r._id}
                  className={cn(
                    'bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4',
                    config.border,
                    config.bg
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-zinc-900">
                        {tx ? formatCompactPrice(tx.amount, tx.currency) : '—'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-widest', config.border, config.text)}>
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{r.reason}</p>
                    {r.adminNotes && (
                      <p className="mt-1 text-xs text-zinc-500 italic">Support: {r.adminNotes}</p>
                    )}
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Requested {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-start">
        <Button variant="zeni-secondary" size="zeni-sm" onClick={() => navigate('/app/profile')} leftIcon={<ArrowLeft className="w-3 h-3" />}>
          Back to profile
        </Button>
      </div>
    </PageTransition>
  );
}
