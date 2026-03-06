import React from 'react';
import { PayTransaction } from '../payApi';
import { formatDate, formatCurrency } from '../../lib/format';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
  reversed: 'bg-slate-200 text-slate-600',
};

export function TransactionsTable({
  transactions,
  onSelect,
  onDownloadReceipt,
}: {
  transactions: PayTransaction[];
  onSelect: (tx: PayTransaction) => void;
  onDownloadReceipt?: (receiptId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Date</th>
            <th className="px-4 py-3 text-left font-semibold">Method</th>
            <th className="px-4 py-3 text-left font-semibold">Ref #</th>
            <th className="px-4 py-3 text-left font-semibold">Amount</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Risk</th>
            <th className="px-4 py-3 text-left font-semibold">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx._id}
              className="border-t border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40 cursor-pointer"
              onClick={() => onSelect(tx)}
            >
              <td className="px-4 py-3">{formatDate(tx.createdAt)}</td>
              <td className="px-4 py-3">{tx.method}</td>
              <td className="px-4 py-3">{tx.ref || '-'}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(tx.amount, tx.currency)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[tx.status] || 'bg-slate-200 text-slate-600'}`}
                >
                  {tx.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {tx.riskLevel ? (
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      tx.riskLevel === 'high'
                        ? 'bg-rose-100 text-rose-700'
                        : tx.riskLevel === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tx.riskLevel.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                {tx.receiptId ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadReceipt?.(tx.receiptId as string);
                    }}
                    className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                  >
                    Download
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                No transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
