/**
 * Stripe card payments: create PaymentIntent for portal, handle webhook to mark transaction paid.
 */
import Stripe from 'stripe';
import { env } from '../config/env';
import { PayTransactionModel } from '../models/PayTransaction';
import { markTransactionPaidAndNotify } from './payPortal.service';

let stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!env.stripe.secretKey) return null;
  if (!stripe) stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2026-01-28.clover' });
  return stripe;
}

/** KES uses minor units (cents): 100 KES = 10000 */
function toStripeAmount(amountKes: number): number {
  return Math.round(Number(amountKes) * 100);
}

export interface CreatePaymentIntentParams {
  amountKes: number;
  currency: string;
  payTransactionId: string;
  userId: string;
  purpose?: string;
  referenceId?: string;
}

/**
 * Create a Stripe PaymentIntent for a portal card payment. Caller stores paymentIntent.id in PayTransaction.ref.
 * Returns clientSecret for frontend and paymentIntentId for ref.
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const s = getStripe();
  if (!s) return null;

  const amount = toStripeAmount(params.amountKes);
  if (amount < 100) throw Object.assign(new Error('Amount too small for card'), { status: 400 });

  const paymentIntent = await s.paymentIntents.create({
    amount,
    currency: params.currency.toLowerCase() === 'kes' ? 'kes' : 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      payTransactionId: params.payTransactionId,
      userId: params.userId,
      purpose: params.purpose || '',
      referenceId: params.referenceId || '',
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a client secret');
  }

  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
}

/**
 * Handle Stripe webhook payment_intent.succeeded: find our PayTransaction by ref (pi_xxx), mark paid, receipt, side effects.
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const tx = await PayTransactionModel.findOne({ ref: paymentIntent.id });
  if (!tx || tx.status === 'paid') return;

  const receiptNumber =
    paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object'
      ? (paymentIntent.latest_charge as { receipt_url?: string }).receipt_url ||
        `STRIPE-${Date.now()}-${tx.id.slice(-6)}`
      : `STRIPE-${Date.now()}-${tx.id.slice(-6)}`;

  await markTransactionPaidAndNotify(tx, receiptNumber, paymentIntent.id, {
    setStatusToPaid: true,
    rawCallback: { stripe: true, paymentIntentId: paymentIntent.id },
  });
}
