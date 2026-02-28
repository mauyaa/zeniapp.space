import React from 'react';
import { Card } from '../../../components/ui/Card';

export function PayAdminAuditPage() {
  const rows = [
    { actor: 'Finance Joy', action: 'Approve refund', ref: 'tx-40', when: 'Today 10:02' },
    { actor: 'Admin Kim', action: 'Mark paid (manual bank)', ref: 'tx-38', when: 'Yesterday' }
  ];
  return (
    <Card className="divide-y divide-slate-800">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-3 text-sm text-slate-200">
          <div>
            <div className="font-semibold">{r.action}</div>
            <div className="text-xs text-slate-400">{r.ref}</div>
          </div>
          <div className="text-xs text-slate-500">{r.when} • {r.actor}</div>
        </div>
      ))}
    </Card>
  );
}
