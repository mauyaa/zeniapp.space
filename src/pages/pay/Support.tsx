import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function PaySupportPage() {
  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <div className="text-sm font-semibold text-slate-100">Payment not reflecting?</div>
        <textarea
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-100"
          rows={3}
          placeholder="Describe the issue and include reference if you have one."
        />
        <Button>Open ticket</Button>
      </Card>
    </div>
  );
}
