import React from 'react';
import { FileText, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

const invoices = [
  { id: 'inv-101', amount: 'KES 25,000', due: 'Feb 12', status: 'unpaid' as const },
  { id: 'inv-099', amount: 'KES 25,000', due: 'Jan 12', status: 'paid' as const }
];

const statusConfig = {
  paid: { icon: CheckCircle2, label: 'Paid', tone: 'emerald' as const, bg: 'bg-emerald-500/10' },
  unpaid: { icon: Clock, label: 'Unpaid', tone: 'amber' as const, bg: 'bg-amber-500/10' },
};

export function PayInvoicesPage() {
  const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 mb-1">Invoices</p>
            <h1 className="text-xl font-semibold text-slate-100">Your invoices</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                <span className="text-amber-300 font-semibold">{unpaidCount}</span> unpaid
              </span>
              <span className="text-slate-400">
                <span className="text-emerald-300 font-semibold">{paidCount}</span> paid
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="space-y-3">
        {invoices.map((inv) => {
          const config = statusConfig[inv.status];
          const StatusIcon = config.icon;

          return (
            <Card key={inv.id} className="border-slate-800 bg-slate-900/70 overflow-hidden" padding="none">
              <div className="flex items-center gap-4 p-4">
                {/* Status indicator */}
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} flex-shrink-0`}>
                  <StatusIcon className={`h-4 w-4 ${inv.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`} />
                </div>

                {/* Invoice details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">Invoice {inv.id}</span>
                    <Badge tone={config.tone}>{config.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {inv.status === 'unpaid' ? `Due ${inv.due}` : `Paid on ${inv.due}`}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-semibold text-slate-100 font-mono">{inv.amount}</p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {inv.status === 'unpaid' ? (
                    <Link to={`/pay/checkout/${inv.id}`}>
                      <Button size="sm">
                        Pay now <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline">
                      <FileText className="w-3 h-3 mr-1" />
                      Receipt
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {invoices.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <FileText className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No invoices found.</p>
        </div>
      )}
    </div>
  );
}
