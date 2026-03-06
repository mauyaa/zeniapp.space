import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

const pending = [
  { id: 'tx-44', invoice: 'inv-101', phone: '07xx123', amount: 'KES 25,000' },
  { id: 'tx-45', invoice: 'inv-090', phone: '07xx555', amount: 'KES 12,000' },
];

export function PayAdminReconciliationPage() {
  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <Card key={p.id} className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100">{p.invoice}</div>
            <div className="text-xs text-slate-400">{p.phone}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="amber">pending</Badge>
            <div className="text-sm font-semibold text-slate-100">{p.amount}</div>
            <Button size="sm">Approve</Button>
            <Button size="sm" tone="secondary">
              Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
