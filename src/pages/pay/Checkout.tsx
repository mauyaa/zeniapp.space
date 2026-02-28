import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export function PayCheckoutPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [status, setStatus] = useState<'summary' | 'waiting' | 'paid' | 'failed'>('summary');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (status === 'waiting') {
      const t = setTimeout(() => setStatus('paid'), 8000); // dev mock
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="text-sm font-semibold text-slate-100">Invoice {invoiceId}</div>
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Total</span>
          <span className="text-lg font-semibold text-slate-100">KES 25,000</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Badge tone="amber">Pending</Badge>
          <span>Secure M-Pesa STK • Do not share your PIN</span>
        </div>
      </Card>

      {status === 'summary' && (
        <Card className="space-y-3">
          <label className="text-sm text-slate-200">
            M-Pesa phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              placeholder="07xx..."
            />
          </label>
          <Button onClick={() => setStatus('waiting')} disabled={!phone}>
            Send STK prompt
          </Button>
        </Card>
      )}

      {status === 'waiting' && (
        <Card className="space-y-2 text-sm text-slate-300">
          <div className="font-semibold text-slate-100">Waiting for payment</div>
          Check your phone to enter PIN. This may take up to 90 seconds.
        </Card>
      )}

      {status === 'paid' && (
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-300">
            <span>✓</span>
            <span className="font-semibold">Paid</span>
          </div>
          <div className="text-sm text-slate-300">Receipt: QW12RT89</div>
        </Card>
      )}
    </div>
  );
}
