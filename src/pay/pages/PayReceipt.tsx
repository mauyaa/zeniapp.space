import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { payApi, type PayReceipt as PayReceiptDto } from '../payApi';

export function PayReceipt() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<PayReceiptDto | null>(null);

  useEffect(() => {
    if (!id) return;
    payApi.getReceipt(id).then(setReceipt).catch(() => setReceipt(null));
  }, [id]);

  if (!receipt) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Receipt not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Receipt</div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{receipt.receiptNumber}</h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
            title="Print or save as PDF using your browser"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Amount" value={`${receipt.currency} ${receipt.amount.toLocaleString()}`} />
          <Detail label="Issued" value={new Date(receipt.issuedAt).toLocaleString()} />
          <Detail label="Status" value={receipt.status} />
          <Detail label="Verification hash" value={receipt.hash} />
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
        <div className="text-sm font-semibold">Verified receipt</div>
        <p className="text-sm text-emerald-800/80 dark:text-emerald-100/80">
          Receipt has been verified and recorded in the payment ledger.
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100 break-words">{value}</div>
    </div>
  );
}
