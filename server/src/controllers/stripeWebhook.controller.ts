import { Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import { handlePaymentIntentSucceeded } from '../services/stripe.service';

export async function stripeWebhook(req: Request, res: Response) {
  if (!env.stripe.secretKey || !env.stripe.webhookSecret) {
    return res
      .status(503)
      .json({ code: 'STRIPE_DISABLED', message: 'Stripe webhook not configured' });
  }

  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ code: 'INVALID_BODY', message: 'Webhook body must be raw' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).json({ code: 'MISSING_SIGNATURE', message: 'Missing Stripe-Signature' });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2026-01-28.clover' });
    event = stripe.webhooks.constructEvent(rawBody, sig, env.stripe.webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return res.status(400).json({ code: 'WEBHOOK_SIGNATURE_INVALID', message });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    try {
      await handlePaymentIntentSucceeded(paymentIntent);
    } catch (e) {
      console.error('[stripe webhook] handlePaymentIntentSucceeded failed', e);
      return res.status(500).json({ code: 'HANDLER_ERROR', message: 'Failed to process payment' });
    }
  }

  res.status(200).json({ received: true });
}
