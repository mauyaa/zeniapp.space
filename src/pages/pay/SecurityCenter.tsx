import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export function PaySecurityPage() {
  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <div className="text-sm font-semibold text-slate-100">Security Center</div>
        <div className="text-xs text-slate-400">Recent logins • Active sessions</div>
      </Card>
      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge tone="emerald">Phone verified</Badge>
          <span className="text-xs text-slate-300">07•••123</span>
        </div>
        <div className="text-xs text-slate-400">Do not share OTP/PIN with anyone.</div>
      </Card>
    </div>
  );
}
