import React, { useEffect, useState } from 'react';
import { payApi, PayTransaction } from '../payApi';
import { StepUpModal } from '../components/StepUpModal';

type PendingApprovalResult = { pendingApproval: boolean; tx: PayTransaction; message?: string };

const isPendingApprovalResult = (
  value: PayTransaction | PendingApprovalResult
): value is PendingApprovalResult =>
  Boolean(value && typeof value === 'object' && 'pendingApproval' in value);

export function PayAdminReconcile() {
  const [pending, setPending] = useState<PayTransaction[]>([]);
  const [failed, setFailed] = useState<PayTransaction[]>([]);
  const [selected, setSelected] = useState<PayTransaction | null>(null);
  const [action, setAction] = useState<'resolve' | 'refund' | null>(null);
  const [message, setMessage] = useState('');
  const [insights, setInsights] = useState<{
    pending: number;
    stalePending: number;
    failed: number;
    missingReceipts: number;
    lastStaleRun?: string;
    lastReceiptScan?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    payApi
      .reconcile()
      .then((data) => {
        setPending(data.pending || []);
        setFailed(data.failed || []);
      })
      .catch(() => {
        setPending([]);
        setFailed([]);
      });
    payApi
      .insights()
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (code: string) => {
    if (!selected || !action) return;
    await payApi.stepUp(code);
    if (action === 'resolve') {
      const res = await payApi.resolve(selected._id, 'paid');
      if (isPendingApprovalResult(res) && res.pendingApproval) {
        setMessage('Approval recorded. Waiting for a second approver.');
      } else {
        setMessage('Transaction resolved.');
      }
    } else {
      const res = await payApi.refund(selected._id);
      if (isPendingApprovalResult(res) && res.pendingApproval) {
        setMessage('Refund approval recorded. Waiting for a second approver.');
      } else {
        setMessage('Refund recorded.');
      }
    }
    setSelected(null);
    setAction(null);
    load();
  };

  return (
    <div className="space-y-6">
      {insights && (
        <div className="grid gap-3 sm:grid-cols-3">
          <InsightCard label="Pending" value={insights.pending} tone="amber" />
          <InsightCard label="Stale pending" value={insights.stalePending} tone="rose" />
          <InsightCard label="Failed" value={insights.failed} tone="slate" />
          <InsightCard label="Missing receipts" value={insights.missingReceipts} tone="yellow" />
          {insights.lastStaleRun && (
            <InsightCard
              label="Last stale sweep"
              value={new Date(insights.lastStaleRun).toLocaleString()}
              tone="emerald"
            />
          )}
          {insights.lastReceiptScan && (
            <InsightCard
              label="Last receipt scan"
              value={new Date(insights.lastReceiptScan).toLocaleString()}
              tone="emerald"
            />
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <Section
        title="Pending callbacks"
        subtitle="Transactions waiting for verification or callback confirmation."
        items={pending}
        onResolve={(tx) => {
          setSelected(tx);
          setAction('resolve');
        }}
        onRefund={(tx) => {
          setSelected(tx);
          setAction('refund');
        }}
      />

      <Section
        title="Failed transactions"
        subtitle="Transactions that failed and may need manual review."
        items={failed}
        onResolve={(tx) => {
          setSelected(tx);
          setAction('resolve');
        }}
        onRefund={(tx) => {
          setSelected(tx);
          setAction('refund');
        }}
      />

      <StepUpModal
        open={Boolean(selected && action)}
        title="Step-up verification"
        description="Enter your verification code to proceed."
        onClose={() => {
          setSelected(null);
          setAction(null);
        }}
        onVerify={handleAction}
      />
    </div>
  );
}

function InsightCard({
  label,
  value,
  tone = 'emerald',
}: {
  label: string;
  value: string | number;
  tone?: 'emerald' | 'amber' | 'rose' | 'yellow' | 'slate';
}) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${colors[tone] || colors.emerald}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  items,
  onResolve,
  onRefund,
}: {
  title: string;
  subtitle: string;
  items: PayTransaction[];
  onResolve: (tx: PayTransaction) => void;
  onRefund: (tx: PayTransaction) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-500">No items.</div>}
        {items.map((tx) => (
          <div
            key={tx._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
          >
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {tx.currency} {tx.amount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Ref {tx.ref || '--'}</div>
              <div className="text-xs text-slate-500">
                Approvals: {tx.approvals?.length || 0}{' '}
                {tx.approvals?.length ? ' / dual-control' : ''}
              </div>
              {tx.riskLevel && <RiskBadge level={tx.riskLevel} flags={tx.riskFlags} />}
              {tx.receiptId && <div className="text-xs text-emerald-600">Receipt attached</div>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onResolve(tx)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Resolve
              </button>
              <button
                onClick={() => onRefund(tx)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
              >
                Refund
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskBadge({ level, flags }: { level?: string; flags?: string[] }) {
  const colors: Record<string, string> = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const label = level ? level.toUpperCase() : 'LOW';
  const tone = level && colors[level] ? colors[level] : colors.low;
  return (
    <div
      className={`mt-1 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold ${tone}`}
    >
      <span>{label} risk</span>
      {flags?.length ? (
        <span className="text-[10px] text-slate-500">{flags.slice(0, 2).join(', ')}</span>
      ) : null}
    </div>
  );
}
