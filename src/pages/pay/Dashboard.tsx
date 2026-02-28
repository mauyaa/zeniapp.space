import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CreditCard, FileText, Receipt, Shield, Smartphone } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function PayDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 mb-1">Payments</p>
            <h1 className="text-xl font-semibold text-slate-100">Financial overview</h1>
            <p className="text-sm text-slate-400 mt-1">Track balances, invoices, and payment history.</p>
          </div>
          <Button onClick={() => navigate('/pay/invoices')}>
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Pay now
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" value="KES 42,500" trend="-12%" tone="amber" />
        <StatCard label="Next due" value="Feb 12" trend="5 days" tone="rose" />
        <StatCard label="Paid this month" value="KES 120,000" trend="+KES 20k" tone="emerald" />
        <StatCard label="Receipts" value="8" trend="+2 new" tone="blue" />
      </div>

      {/* Quick pay card */}
      <Card className="border-slate-800 bg-slate-900/70">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 flex-shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-100">M-Pesa quick pay</h2>
            <p className="text-sm text-slate-400 mt-1">
              Settle your next invoice instantly. An STK push prompt will be sent to your registered phone — no card data stored.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={() => navigate('/pay/invoices')}>
                View invoices
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/pay/security')}>
                <Shield className="w-3 h-3 mr-1" />
                Security
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Invoices', icon: FileText, to: '/pay/invoices', desc: 'View and pay pending invoices' },
          { label: 'Transaction history', icon: Receipt, to: '/pay/history', desc: 'All past payments and receipts' },
          { label: 'Security center', icon: Shield, to: '/pay/security', desc: 'Phone verification & controls' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-800/50 hover:border-slate-700 transition-colors text-left group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 group-hover:text-emerald-300 transition-colors flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
