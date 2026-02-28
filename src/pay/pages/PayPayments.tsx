import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Info, Calendar } from 'lucide-react';
import { payApi } from '../payApi';
import { usePayAuth } from '../PayAuthContext';
import { getPaySocket } from '../paySocket';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';

const stripePublishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || '';
const bankName = (import.meta.env.VITE_PAY_BANK_NAME as string) || 'Zeni Payments';
const bankAccount = (import.meta.env.VITE_PAY_BANK_ACCOUNT as string) || 'KES 1234567890';

type PayMethod = 'mpesa_stk' | 'card' | 'bank_transfer';

const METHOD_LABELS: Record<PayMethod, { name: string; subtitle: string }> = {
  mpesa_stk: { name: 'M-Pesa', subtitle: 'Mobile Money' },
  card: { name: 'Card', subtitle: 'Visa / MC' },
  bank_transfer: { name: 'Bank', subtitle: 'Transfer' },
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#fff',
      '::placeholder': { color: '#71717a' },
      iconColor: '#10b981'
    },
    invalid: {
      color: '#f87171'
    }
  }
};

function CardForm({
  clientSecret,
  amountNum,
  onSuccess,
  onError
}: {
  clientSecret: string;
  amountNum: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setLoading(true);
    onError('');
    try {
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card }
      });
      if (error) {
        onError(error.message || 'Card payment failed');
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Card details
        </label>
        <div className="bg-black border border-zinc-700 rounded-sm p-4 focus-within:border-emerald-500 transition-colors">
          <CardElement options={cardElementOptions} />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-white text-black py-4 text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
      >
        {loading ? 'Processing…' : `Pay KES ${amountNum.toLocaleString()}`}
      </button>
    </form>
  );
}

export function PayPayments() {
  const [searchParams] = useSearchParams();
  const purpose = searchParams.get('purpose') || undefined;
  const referenceId = searchParams.get('referenceId') || undefined;
  const amountFromUrl = searchParams.get('amount');
  const initialAmount = amountFromUrl && /^\d+$/.test(amountFromUrl) ? amountFromUrl : '25000';
  const [amount, setAmount] = useState(initialAmount);
  const [method, setMethod] = useState<PayMethod>('mpesa_stk');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bankRef, setBankRef] = useState<string | null>(null);
  const { accessToken } = usePayAuth();
  const { success: toastSuccess } = useToast();

  const isViewingFee = purpose === 'viewing_fee';
  const isPropertyPurchase = purpose === 'property_purchase' || purpose === 'rent';
  const amountNum = Number(amount) || 0;
  const maskedPhone = phone ? `${phone.slice(0, 3)} *** ***` : '0712 *** ***';
  const showCardForm = Boolean(clientSecret && method === 'card');

  const handlePay = async () => {
    setStatus('pending');
    setMessage('');
    setBankRef(null);
    try {
      const idem = referenceId
        ? (purpose === 'viewing_fee'
            ? `viewing-fee-${referenceId}-${Date.now()}`
            : `property-${purpose}-${referenceId}-${Date.now()}`)
        : `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await payApi.initiatePayment(
        {
          amount: amountNum,
          currency: 'KES',
          method,
          phone: method === 'mpesa_stk' ? phone || undefined : undefined,
          purpose: purpose || undefined,
          referenceId: referenceId || undefined
        },
        idem
      );

      if (method === 'card') {
        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setStatus('idle');
          setMessage('');
        } else {
          setStatus('error');
          setMessage('Card payments are not available. Please use M-Pesa or bank transfer.');
        }
        return;
      }

      if (method === 'bank_transfer') {
        setBankRef(result.ref || result._id || '');
        setStatus('success');
        setMessage('Use the reference below when making your bank transfer. We will confirm when payment is received.');
        return;
      }

      setStatus('success');
      setMessage(
        isViewingFee
          ? 'Viewing fee payment sent. Complete on your phone to confirm the viewing.'
          : isPropertyPurchase
            ? 'Property payment sent. Complete on your phone; the listing will be marked sold/let once paid.'
            : 'Payment initiated. Awaiting confirmation.'
      );
    } catch (e: unknown) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Payment failed.');
    }
  };

  const handleCardSuccess = () => {
    setStatus('success');
    setMessage('Payment confirmed.');
    toastSuccess('Payment confirmed');
    if ((purpose === 'property_purchase' || purpose === 'rent') && referenceId && amountNum > 0) {
      trackEvent({ name: 'property_paid', payload: { listingId: referenceId, purpose: purpose || '', amount: amountNum, currency: 'KES' } });
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    const socket = getPaySocket(accessToken);
    const onTx = (payload: { status: string }) => {
      if (payload.status === 'paid') {
        setStatus('success');
        setMessage('Payment confirmed.');
        toastSuccess('Payment confirmed');
        if (purpose === 'viewing_fee' && referenceId && amountNum > 0) {
          trackEvent({ name: 'viewing_fee_paid', payload: { viewingId: referenceId, amount: amountNum, currency: 'KES' } });
        }
        if ((purpose === 'property_purchase' || purpose === 'rent') && referenceId && amountNum > 0) {
          trackEvent({ name: 'property_paid', payload: { listingId: referenceId, purpose: purpose || '', amount: amountNum, currency: 'KES' } });
        }
      }
    };
    socket.on('pay:transaction', onTx);
    return () => socket.off('pay:transaction', onTx);
  }, [accessToken, toastSuccess, purpose, referenceId, amountNum]);

  const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 lg:p-10 pay-fade-in">
      <div className="w-full max-w-2xl">
        <div className="bg-[#18181B] border border-zinc-800 p-8 lg:p-10 relative rounded-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-sm" />

          {isViewingFee && (
            <div className="mb-6 flex items-start gap-3 rounded-sm bg-amber-900/30 border border-amber-700 p-4">
              <Calendar className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-amber-200">Viewing fee</p>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Zeni holds this amount until after your viewing. Once the agent marks the showing complete and you confirm, the fee is released to the agent.
                </p>
              </div>
            </div>
          )}
          {isPropertyPurchase && !isViewingFee && (
            <div className="mb-6 flex items-start gap-3 rounded-sm bg-emerald-900/30 border border-emerald-700 p-4">
              <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  {purpose === 'property_purchase' ? 'Property purchase' : 'First month rent'}
                </p>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Once payment is confirmed, this listing will be removed from active listings and marked as already bought/let. You can see it under Already bought on your Pay dashboard.
                </p>
              </div>
            </div>
          )}

          <h2 className="font-serif text-3xl text-white mb-2">
            {isViewingFee ? 'Pay viewing fee' : isPropertyPurchase ? 'Pay for property' : 'Make a Payment'}
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-10">Secure Transaction Gateway</p>

          {showCardForm && stripePromise && clientSecret ? (
            <Elements stripe={stripePromise}>
              <CardForm
                clientSecret={clientSecret}
                amountNum={amountNum}
                onSuccess={handleCardSuccess}
                onError={(msg) => { setMessage(msg); setStatus('error'); }}
              />
            </Elements>
          ) : (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  Payment Amount
                </label>
                <div className="relative glow-border rounded-sm">
                  <span className="absolute left-4 top-4 text-zinc-500 font-mono text-sm">KES</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                    className="w-full bg-black border border-zinc-700 text-white font-mono text-2xl py-3 pl-14 pr-4 focus:outline-none rounded-sm transition-colors focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  Select Method
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(Object.keys(METHOD_LABELS) as PayMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`border py-4 flex flex-col items-center justify-center gap-2 transition-all rounded-sm ${
                        method === m ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-700 bg-black opacity-60 hover:opacity-100 hover:border-white'
                      }`}
                    >
                      <span className="text-xl font-bold text-white">{METHOD_LABELS[m].name}</span>
                      <span className={`text-[9px] uppercase tracking-widest ${method === m ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {METHOD_LABELS[m].subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {method === 'mpesa_stk' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                    M-Pesa phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07xx xxx xxx"
                    className="w-full bg-black border border-zinc-700 text-white font-mono py-3 px-4 focus:outline-none rounded-sm focus:border-emerald-500 transition-colors placeholder:text-zinc-500"
                  />
                </div>
              )}

              {method === 'bank_transfer' && (
                <div className="rounded-sm bg-zinc-900/50 border border-zinc-700 p-4">
                  <p className="text-xs text-zinc-400 mb-2">
                    After you click Confirm, you will see bank account details and a unique reference. Transfer the amount and we will confirm when received.
                  </p>
                </div>
              )}

              {(message || status !== 'idle') && (
                <div
                  role="status"
                  className={`rounded-sm px-4 py-3 text-sm ${
                    status === 'success'
                      ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800'
                      : status === 'error'
                        ? 'bg-red-900/30 text-red-300 border border-red-800'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {message}
                  {status === 'error' && (
                    <p className="mt-2 text-xs opacity-90">Check amount and payment method, then try again.</p>
                  )}
                  {bankRef && (
                    <div className="mt-4 pt-4 border-t border-zinc-700 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bank transfer details</p>
                      <p className="text-xs text-zinc-300 font-mono">Bank: {bankName}</p>
                      <p className="text-xs text-zinc-300 font-mono">Account: {bankAccount}</p>
                      <p className="text-xs text-zinc-300 font-mono">Reference: <strong className="text-white">{bankRef}</strong></p>
                      <p className="text-xs text-amber-300 mt-2">Include this reference so we can match your payment.</p>
                    </div>
                  )}
                  {status === 'pending' && method === 'mpesa_stk' && (
                    <p className="mt-1 text-xs opacity-90">Complete the prompt on your phone to finish.</p>
                  )}
                </div>
              )}

              <div className="bg-zinc-900 p-4 border border-zinc-800 flex items-start gap-3 rounded-sm">
                <Info className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {method === 'mpesa_stk' && (
                    <>By clicking Confirm, a payment request will be sent to your M-Pesa phone number <strong className="text-zinc-300">{maskedPhone}</strong>. Please enter your PIN to complete the transaction.</>
                  )}
                  {method === 'card' && (
                    <>Card payments are secure. We do not store your card number. You will enter card details on the next step.</>
                  )}
                  {method === 'bank_transfer' && (
                    <>Transfer the exact amount to the account shown after you confirm. Use the unique reference so we can identify your payment.</>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handlePay}
                disabled={status === 'pending' || amountNum < 1 || (method === 'mpesa_stk' && !phone.trim())}
                className="w-full bg-white text-black py-4 text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
              >
                {status === 'pending' ? 'Processing…' : method === 'card' ? 'Continue to card' : `Confirm & Pay KES ${amountNum.toLocaleString()}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
