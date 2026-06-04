import { env } from '../config/env';

export function paymentReadinessSnapshot() {
  const stripeReady = Boolean(env.stripe.secretKey && env.stripe.webhookSecret);
  const paystackConfigured = Boolean(env.paystack.secretKey);
  const mpesaReady = Boolean(
    env.mpesa.consumerKey &&
    env.mpesa.consumerSecret &&
    env.mpesa.shortcode &&
    env.mpesa.passkey &&
    env.mpesa.callbackUrl &&
    env.mpesa.callbackSecret &&
    !['dev', '000000'].includes(env.mpesa.consumerKey.toLowerCase())
  );
  return {
    paymentsEnabled: env.paymentsEnabled,
    providers: {
      mpesa: mpesaReady,
      // Configuration alone is not readiness. No Paystack transaction adapter ships in this RC.
      paystack: false,
      stripe: stripeReady,
      manualBankTransfer: env.paymentsEnabled && env.nodeEnv !== 'production',
    },
    unsupportedConfiguredProviders: {
      paystack: paystackConfigured,
    },
  };
}

export function enforcePaymentReadinessAtBoot() {
  const readiness = paymentReadinessSnapshot();
  const supportedProviderReady = readiness.providers.mpesa || readiness.providers.stripe;
  if (env.nodeEnv === 'production' && readiness.paymentsEnabled && !supportedProviderReady) {
    env.paymentsEnabled = false;
    console.error(
      '[payments] PAYMENTS_ENABLED was disabled because no supported production provider is ready'
    );
  }
  return paymentReadinessSnapshot();
}

export function ensurePaymentInitiationAllowed(method: 'mpesa_stk' | 'card' | 'bank_transfer') {
  const readiness = paymentReadinessSnapshot();
  if (!readiness.paymentsEnabled) {
    throw Object.assign(
      new Error('Payments are unavailable while provider readiness is being verified'),
      {
        status: 503,
        code: 'PAYMENTS_DISABLED',
      }
    );
  }
  if (method === 'card' && !readiness.providers.stripe) {
    throw Object.assign(new Error('Card payments are not configured right now'), {
      status: 503,
      code: 'CARD_PROVIDER_UNAVAILABLE',
    });
  }
  if (method === 'bank_transfer' && env.nodeEnv === 'production') {
    throw Object.assign(
      new Error('Production bank transfer payments are not configured right now'),
      {
        status: 503,
        code: 'BANK_TRANSFER_PROVIDER_UNAVAILABLE',
      }
    );
  }
  if (method === 'mpesa_stk' && env.nodeEnv === 'production' && !readiness.providers.mpesa) {
    throw Object.assign(new Error('M-Pesa is not configured right now'), {
      status: 503,
      code: 'MPESA_DISABLED',
    });
  }
}
