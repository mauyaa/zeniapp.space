import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export function PayInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold text-slate-100">Invoice {id}</div>
          <div className="text-sm text-slate-400">Booking fee • Due Feb 12</div>
        </div>
        <Badge tone="amber">unpaid</Badge>
      </div>
      <Card className="space-y-2">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Amount</span>
          <span className="font-semibold text-slate-100">KES 25,000</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Listing</span>
          <span className="text-emerald-300">#L-203 (2BR Kilimani)</span>
        </div>
      </Card>
      <div className="flex gap-2">
        <Link to={`/pay/checkout/${id}`}>
          <Button>Pay via M-Pesa</Button>
        </Link>
        <Button tone="secondary">Download PDF</Button>
      </div>
    </div>
  );
}
