import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { payApi, PayTransaction } from '../payApi';
import { formatCurrency } from '../../lib/format';

const STATUS_STYLE: Record<string, string> = {
  paid: 'text-[9px] font-bold uppercase bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-sm border border-emerald-900',
  completed: 'text-[9px] font-bold uppercase bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-sm border border-emerald-900',
  pending: 'text-[9px] font-bold uppercase bg-amber-900/30 text-amber-400 px-2 py-1 rounded-sm border border-amber-900',
  failed: 'text-[9px] font-bold uppercase bg-red-900/30 text-red-400 px-2 py-1 rounded-sm border border-red-900',
  reversed: 'text-[9px] font-bold uppercase bg-zinc-700/30 text-zinc-400 px-2 py-1 rounded-sm border border-zinc-700',
};

function formatDateOnly(value?: string) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
}

export function PayTransactions() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- navigate kept for future use
  const _navigate = useNavigate();
  const [transactions, setTransactions] = useState<PayTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payApi
      .listTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!statusFilter) return transactions;
    return transactions.filter((tx) => tx.status === statusFilter);
  }, [transactions, statusFilter]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const header = ['Date', 'Narration', 'Reference', 'Status', 'Amount', 'Currency'].join(',');
    const lines = filtered.map((tx) =>
      [
        formatDateOnly(tx.createdAt),
        tx.ref || tx.method || 'Payment',
        tx.ref || tx._id,
        tx.status,
        tx.amount,
        tx.currency,
      ].join(',')
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 pay-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${
              statusFilter === ''
                ? 'border border-emerald-500 text-emerald-400 bg-emerald-900/10'
                : 'border border-zinc-700 text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${
              statusFilter === 'pending'
                ? 'border border-emerald-500 text-emerald-400 bg-emerald-900/10'
                : 'border border-zinc-700 text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('failed')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${
              statusFilter === 'failed'
                ? 'border border-emerald-500 text-emerald-400 bg-emerald-900/10'
                : 'border border-zinc-700 text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            Failed
          </button>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="border border-zinc-800 bg-[#18181B] rounded-sm overflow-hidden">
        <div className="grid grid-cols-6 p-4 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <div className="col-span-1">Date</div>
          <div className="col-span-2">Narration</div>
          <div className="col-span-1">Reference</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Amount</div>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center text-zinc-500">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
            <span className="ml-2">Loading ledger…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">No transactions found.</div>
        ) : (
          filtered.map((tx) => (
            <div
              key={tx._id}
              className="grid grid-cols-6 p-5 border-b border-zinc-800 items-center hover:bg-zinc-800/50 transition-colors"
            >
              <div className="col-span-1 font-mono text-xs text-zinc-400">
                {formatDateOnly(tx.createdAt)}
              </div>
              <div className="col-span-2 text-sm text-white">
                {tx.ref || tx.method?.replace('_', ' ') || 'Payment'}
              </div>
              <div className="col-span-1 font-mono text-xs text-zinc-500">{tx.ref || tx._id.slice(0, 10)}</div>
              <div className="col-span-1">
                <span className={STATUS_STYLE[tx.status] || STATUS_STYLE.failed}>
                  {tx.status === 'paid' || tx.status === 'completed' ? 'Paid' : tx.status}
                </span>
              </div>
              <div
                className={`col-span-1 text-right font-mono text-sm ${
                  tx.status === 'failed' ? 'text-zinc-400 line-through' : 'text-white'
                }`}
              >
                {formatCurrency(tx.amount, tx.currency)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
