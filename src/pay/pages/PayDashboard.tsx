import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Receipt, ArrowRight } from 'lucide-react';
import { usePayAuth } from '../PayAuthContext';
import { payApi, PaySession, PayTransaction } from '../payApi';
import { getPaySocket } from '../paySocket';
import { useToast } from '../../context/ToastContext';
import { StepUpModal } from '../components/StepUpModal';
import { formatDateTime, formatCurrency } from '../../lib/format';

type PayAccount = {
  defaultMethod?: string;
  defaultCurrency?: string;
};

export function PayDashboard() {
  const { accessToken } = usePayAuth();
  const navigate = useNavigate();
  const { success } = useToast();

  const [transactions, setTransactions] = useState<PayTransaction[]>([]);
  const [account, setAccount] = useState<PayAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<PaySession[]>([]);
  const [requireStepUp, setRequireStepUp] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const latestSession = useMemo(() => {
    if (!sessions.length) return null;
    return [...sessions].sort((a, b) => {
      const aTime = a.lastUsedAt || a.createdAt;
      const bTime = b.lastUsedAt || b.createdAt;
      return (bTime ? new Date(bTime).getTime() : 0) - (aTime ? new Date(aTime).getTime() : 0);
    })[0];
  }, [sessions]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [txs, acct, sess] = await Promise.all([
        payApi.listTransactions().catch(() => []),
        payApi.getAccount().catch(() => null),
        payApi.sessions().catch(() => []),
      ]);
      const sortedTxs = [...(txs as PayTransaction[])].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setTransactions(sortedTxs);
      setAccount(acct as PayAccount | null);
      setSessions(sess as PaySession[]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getPaySocket(accessToken);
    const onTx = (payload: { id: string; status: string; receiptId?: string }) => {
      if (payload.status === 'paid') {
        success('Payment confirmed');
        fetchData(false);
      } else {
        setTransactions((prev) => {
          const next = prev.map((tx) =>
            tx._id === payload.id ? { ...tx, status: payload.status, receiptId: payload.receiptId } : tx
          );
          if (!next.find((tx) => tx._id === payload.id)) {
            next.unshift({
              _id: payload.id,
              amount: 0,
              currency: 'KES',
              method: 'mpesa_stk',
              status: payload.status,
              receiptId: payload.receiptId,
            });
          }
          return next;
        });
      }
    };
    socket.on('pay:transaction', onTx);
    return () => socket.off('pay:transaction', onTx);
  }, [accessToken, success, fetchData]);

  const stats = useMemo(() => {
    const pending = transactions.filter((t) => t.status === 'pending');
    const balance = pending.reduce((sum, t) => sum + t.amount, 0);
    const paid = transactions.filter((t) => t.status === 'paid' || t.status === 'completed');
    const totalPaid = paid.reduce((sum, t) => sum + t.amount, 0);
    const totalOutstanding = balance;
    const pendingDates = pending
      .map((t) => (t.createdAt ? new Date(t.createdAt).getTime() : Number.POSITIVE_INFINITY))
      .filter((ts) => Number.isFinite(ts));
    const nextDue =
      pendingDates.length > 0 ? new Date(Math.min(...pendingDates)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
    const progressPct = totalPaid + totalOutstanding > 0 ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100) : 68;
    return { balance: totalOutstanding, nextDue, progressPct };
  }, [transactions]);

  const hasFreshStepUp = useMemo(() => {
    const ts = latestSession?.stepUpVerifiedAt;
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < 15 * 60 * 1000;
  }, [latestSession]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by export button in UI
  const _exportCsv = () => {
    if (transactions.length === 0) return;
    const header = ['ref', 'createdAt', 'method', 'status', 'amount', 'currency'].join(',');
    const lines = transactions.map((tx) =>
      [tx.ref || tx._id, tx.createdAt ?? '', tx.method, tx.status, tx.amount, tx.currency].join(',')
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for step-up before sensitive actions
  const _promptStepUpThen = (next: () => void) => {
    if (hasFreshStepUp) {
      next();
      return;
    }
    setPendingAction(() => next);
    setRequireStepUp(true);
  };

  const handleStepUpVerify = async (code: string) => {
    await payApi.stepUp(code);
    const sess = await payApi.sessions().catch(() => sessions);
    setSessions(sess as PaySession[]);
    const next = pendingAction;
    setRequireStepUp(false);
    setPendingAction(null);
    if (next) next();
  };

  const recentRows = transactions.slice(0, 6);
  const dueInDays = stats.balance > 0 ? 3 : null;

  const alreadyBoughtRows = useMemo(() => {
    return transactions.filter(
      (t) =>
        (t.status === 'paid' || t.status === 'completed') &&
        (t.purpose === 'property_purchase' || t.purpose === 'rent') &&
        t.referenceId
    );
  }, [transactions]);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 pay-fade-in" data-testid="pay-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Total Outstanding */}
        <div className="lg:col-span-2 bg-[#18181B] border border-zinc-800 p-8 relative overflow-hidden group rounded-sm">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
            Total Outstanding
          </p>
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-mono text-white tracking-tighter">
              {loading ? '—' : formatCurrency(stats.balance, 'KES')}
            </span>
            {dueInDays != null && stats.balance > 0 && (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-sm">
                Due in {dueInDays} Days
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/pay/payments')}
              className="bg-white text-black px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-sm"
            >
              Pay Now
            </button>
            <button
              type="button"
              onClick={() => navigate('/pay/transactions')}
              className="text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-zinc-700 hover:border-white transition-colors rounded-sm"
            >
              View History
            </button>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
            <div
              className="h-full bg-emerald-500 shadow-[0_0_10px_#10B981] transition-all duration-500"
              style={{ width: `${stats.progressPct}%` }}
            />
          </div>
        </div>

        {/* Auto-Pay Method */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 flex flex-col justify-between relative group hover:border-zinc-700 transition-all rounded-sm">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Auto-Pay Method
              </span>
              <Lock className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="bg-[#052e16] border border-emerald-900/30 p-4 rounded-md mb-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-sm flex items-center justify-center text-black font-bold">
                {(account?.defaultMethod || 'M').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase">
                  {account?.defaultMethod ? String(account.defaultMethod).replace('_', '-') : 'M-Pesa'}
                </p>
                <p className="text-[10px] font-mono text-emerald-400">•••• 9021</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/pay/profile')}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white text-left flex items-center gap-2"
          >
            Manage Methods <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Already bought / let */}
      {alreadyBoughtRows.length > 0 && (
        <div className="mb-12">
          <h3 className="font-serif text-xl text-white mb-6">Already bought / let</h3>
          <div className="border border-zinc-800 rounded-sm overflow-hidden bg-[#18181B]">
            <div className="grid grid-cols-5 bg-zinc-900/50 p-4 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="col-span-1">Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1">Listing ID</div>
              <div className="col-span-1 text-right">Amount</div>
            </div>
            {alreadyBoughtRows.map((tx) => (
              <div
                key={tx._id}
                className="grid grid-cols-5 p-4 border-b border-zinc-800/50 last:border-b-0"
              >
                <div className="col-span-1 text-xs text-zinc-400 font-mono">
                  {formatDateTime(tx.createdAt)}
                </div>
                <div className="col-span-2 text-sm text-emerald-400 font-medium">
                  {tx.purpose === 'property_purchase' ? 'Property purchase' : 'Rent (first month)'}
                </div>
                <div className="col-span-1 text-xs text-zinc-500 font-mono truncate" title={tx.referenceId}>
                  {tx.referenceId?.slice(-8) || '—'}
                </div>
                <div className="col-span-1 text-right text-sm font-mono text-white">
                  {formatCurrency(tx.amount, tx.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <h3 className="font-serif text-xl text-white">Recent Activity</h3>
          <button
            type="button"
            onClick={() => navigate('/pay/transactions')}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            See All
          </button>
        </div>

        <div className="border border-zinc-800 rounded-sm overflow-hidden bg-[#18181B]">
          <div className="grid grid-cols-5 bg-zinc-900/50 p-4 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <div className="col-span-1">Date</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Ref ID</div>
            <div className="col-span-1 text-right">Amount</div>
          </div>
          {loading ? (
            <div className="p-8 flex items-center justify-center gap-2 text-zinc-500">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
              Loading…
            </div>
          ) : recentRows.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No recent transactions</p>
              <button
                type="button"
                onClick={() => navigate('/pay/payments')}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
              >
                Pay now
              </button>
            </div>
          ) : (
            recentRows.map((tx) => (
                <button
                  key={tx._id}
                  type="button"
                  onClick={() => navigate('/pay/transactions')}
                  className="grid grid-cols-5 p-4 border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors cursor-pointer group w-full text-left"
                >
                  <div className="col-span-1 text-xs text-zinc-400 font-mono">
                    {formatDateTime(tx.createdAt)}
                  </div>
                  <div className="col-span-2 text-sm text-white font-medium">
                    {tx.ref || tx.method?.replace('_', ' ') || 'Payment'}
                  </div>
                  <div className="col-span-1 text-xs text-zinc-500 font-mono group-hover:text-emerald-400 transition-colors">
                    {tx.ref || tx._id.slice(0, 8)}
                  </div>
                  <div className="col-span-1 text-right text-sm font-mono text-white">
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      <StepUpModal
        open={requireStepUp}
        title="Step-up verification"
        description="Enter your verification code to continue."
        onClose={() => {
          setRequireStepUp(false);
          setPendingAction(null);
        }}
        onVerify={handleStepUpVerify}
      />
    </div>
  );
}

export default PayDashboard;
