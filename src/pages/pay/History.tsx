import React from 'react';
import { ArrowUpRight, Clock, CheckCircle2, Receipt } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const tx = [
  {
    id: 'tx-1',
    invoiceId: 'inv-099',
    amount: 'KES 25,000',
    status: 'paid' as const,
    when: 'Jan 12, 10:04',
    method: 'M-Pesa',
  },
  {
    id: 'tx-2',
    invoiceId: 'inv-101',
    amount: 'KES 25,000',
    status: 'pending' as const,
    when: 'Feb 2, 09:20',
    method: 'M-Pesa',
  },
];

const statusConfig = {
  paid: { icon: CheckCircle2, tone: 'emerald' as const, label: 'Completed' },
  pending: { icon: Clock, tone: 'amber' as const, label: 'Pending' },
};

export function PayHistoryPage() {
  const completedCount = tx.filter((t) => t.status === 'paid').length;
  const pendingCount = tx.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 mb-1">
              Transactions
            </p>
            <h1 className="text-xl font-semibold text-slate-100">Payment history</h1>
            <p className="text-sm text-slate-400 mt-1">
              All your past payments and pending transactions.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-300 font-semibold">{completedCount}</span> completed
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-amber-300 font-semibold">{pendingCount}</span> pending
            </span>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {tx.map((t) => {
          const config = statusConfig[t.status];

          return (
            <Card key={t.id} className="border-slate-800 bg-slate-900/70" padding="none">
              <div className="flex items-center gap-4 p-4">
                {/* Direction icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
                    t.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                  }`}
                >
                  {t.status === 'paid' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{t.id}</span>
                    <Badge tone={config.tone}>{config.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>Invoice {t.invoiceId}</span>
                    <span className="text-slate-700">·</span>
                    <span>{t.method}</span>
                    <span className="text-slate-700">·</span>
                    <span>{t.when}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-semibold text-slate-100 font-mono">{t.amount}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {tx.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <Receipt className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No transactions yet.</p>
        </div>
      )}
    </div>
  );
}
