import request from 'supertest';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { UserModel } from '../src/models/User';
import { PayTransactionModel } from '../src/models/PayTransaction';
import { PayReceiptModel } from '../src/models/PayReceipt';
import { AuditLogModel } from '../src/models/AuditLog';
import { enforcePaymentReadinessAtBoot } from '../src/services/paymentReadiness.service';
import { shouldSkipDbTests } from './skipDb';

async function loginPay(emailOrPhone: string, password: string) {
  const res = await request(app)
    .post('/api/pay/auth/login')
    .send({ emailOrPhone, password })
    .expect(200);
  return res.body.accessToken as string;
}

describe('pay portal', () => {
  const originalPaystackSecretKey = env.paystack.secretKey;
  const originalPaystackPreferred = env.paystack.preferred;
  const originalStripeSecretKey = env.stripe.secretKey;
  const originalStripeWebhookSecret = env.stripe.webhookSecret;
  const originalPaymentsEnabled = env.paymentsEnabled;
  const originalPayStepUpCode = env.payStepUpCode;
  const originalNodeEnv = env.nodeEnv;
  const originalMpesa = { ...env.mpesa };

  afterEach(() => {
    env.paystack.secretKey = originalPaystackSecretKey;
    env.paystack.preferred = originalPaystackPreferred;
    env.stripe.secretKey = originalStripeSecretKey;
    env.stripe.webhookSecret = originalStripeWebhookSecret;
    env.paymentsEnabled = originalPaymentsEnabled;
    env.payStepUpCode = originalPayStepUpCode;
    Object.assign(env.mpesa, originalMpesa);
    (env as { nodeEnv: string }).nodeEnv = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('keeps browser refresh tokens in an HTTP-only pay cookie', async () => {
    if (shouldSkipDbTests()) return;
    await UserModel.create({
      name: 'Cookie Pay User',
      emailOrPhone: 'cookiepay@test.com',
      password: 'secret123',
      role: 'user',
    });
    const response = await request(app)
      .post('/api/pay/auth/login')
      .send({ emailOrPhone: 'cookiepay@test.com', password: 'secret123' })
      .expect(200);
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.headers['set-cookie']?.[0]).toContain('payRefreshToken=');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('rejects payment initiation until user identity verification is complete', async () => {
    if (shouldSkipDbTests()) return;
    await UserModel.create({
      name: 'Unverified Pay User',
      emailOrPhone: 'unverified-pay@test.com',
      password: 'secret123',
      role: 'user',
    });
    const token = await loginPay('unverified-pay@test.com', 'secret123');
    const response = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'idem-unverified-pay-1')
      .send({ amount: 1000, currency: 'KES', method: 'bank_transfer' })
      .expect(403);
    expect(response.body.code).toBe('KYC_REQUIRED');
  });

  it('fails closed when payments are disabled by readiness configuration', async () => {
    if (shouldSkipDbTests()) return;
    env.paymentsEnabled = false;
    await UserModel.create({
      name: 'Disabled Pay User',
      emailOrPhone: 'disabled-pay@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const token = await loginPay('disabled-pay@test.com', 'secret123');
    const response = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'disabled-pay-1')
      .send({ amount: 1000, currency: 'KES', method: 'bank_transfer' })
      .expect(503);
    expect(response.body.code).toBe('PAYMENTS_DISABLED');
  });

  it('fails closed for unconfigured production bank transfer initiation', async () => {
    if (shouldSkipDbTests()) return;
    (env as { nodeEnv: string }).nodeEnv = 'production';
    env.paymentsEnabled = true;
    env.paystack.secretKey = '';
    await UserModel.create({
      name: 'Bank Provider User',
      emailOrPhone: 'bank-provider@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const token = await loginPay('bank-provider@test.com', 'secret123');
    const response = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'bank-provider-1')
      .send({ amount: 1000, currency: 'KES', method: 'bank_transfer' })
      .expect(503);
    expect(response.body.code).toBe('BANK_TRANSFER_PROVIDER_UNAVAILABLE');
  });

  it('does not treat a configured Paystack secret as a ready provider without an adapter', async () => {
    if (shouldSkipDbTests()) return;
    (env as { nodeEnv: string }).nodeEnv = 'production';
    env.paymentsEnabled = true;
    env.paystack.secretKey = 'configured-but-unsupported';
    await UserModel.create({
      name: 'Unsupported Provider User',
      emailOrPhone: 'unsupported-provider@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const token = await loginPay('unsupported-provider@test.com', 'secret123');
    const response = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'unsupported-provider-1')
      .send({ amount: 1000, currency: 'KES', method: 'bank_transfer' })
      .expect(503);
    expect(response.body.code).toBe('BANK_TRANSFER_PROVIDER_UNAVAILABLE');
  });

  it('disables production payments at boot when no supported provider is ready', () => {
    (env as { nodeEnv: string }).nodeEnv = 'production';
    env.paymentsEnabled = true;
    env.paystack.secretKey = 'configured-but-unsupported';
    env.stripe.secretKey = '';
    env.stripe.webhookSecret = '';
    env.mpesa.consumerKey = '';
    env.mpesa.consumerSecret = '';
    env.mpesa.shortcode = '';
    env.mpesa.passkey = '';
    env.mpesa.callbackSecret = '';

    const readiness = enforcePaymentReadinessAtBoot();

    expect(readiness.paymentsEnabled).toBe(false);
    expect(readiness.providers.paystack).toBe(false);
    expect(readiness.unsupportedConfiguredProviders.paystack).toBe(true);
  });

  it('blocks suspended users from pay APIs', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({
      name: 'Suspended User',
      emailOrPhone: 'suspended@pay.test',
      password: 'secret123',
      role: 'user',
    });
    const token = await loginPay('suspended@pay.test', 'secret123');
    await UserModel.findByIdAndUpdate(user.id, { status: 'suspended' });

    await request(app)
      .get('/api/pay/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('enforces idempotency on payment initiation', async () => {
    if (shouldSkipDbTests()) return;
    await UserModel.create({
      name: 'Pay User',
      emailOrPhone: 'payuser@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const token = await loginPay('payuser@test.com', 'secret123');
    const idemKey = 'idem-portal-1';

    const first = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idemKey)
      .send({ amount: 1000, currency: 'KES', method: 'mpesa_stk', phone: '0712345678' })
      .expect(201);

    const second = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idemKey)
      .send({ amount: 1000, currency: 'KES', method: 'mpesa_stk', phone: '0712345678' })
      .expect(201);

    expect(second.body._id || second.body.id).toBe(first.body._id || first.body.id);

    const count = await PayTransactionModel.countDocuments({ idempotencyKey: idemKey });
    expect(count).toBe(1);
  });

  it('fails closed for card payments when no card provider is configured', async () => {
    if (shouldSkipDbTests()) return;
    env.paymentsEnabled = true;
    env.paystack.secretKey = '';
    env.stripe.secretKey = '';
    await UserModel.create({
      name: 'Card Provider User',
      emailOrPhone: 'card-provider@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const token = await loginPay('card-provider@test.com', 'secret123');

    const response = await request(app)
      .post('/api/pay/transactions/initiate')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'card-provider-1')
      .send({ amount: 3500, currency: 'KES', method: 'card' })
      .expect(503);

    expect(response.body.code).toBe('CARD_PROVIDER_UNAVAILABLE');
  });

  it('creates one deterministic receipt for duplicate signed payment callbacks', async () => {
    if (shouldSkipDbTests()) return;
    env.mpesa.callbackSecret = 'portal-callback-secret';
    const user = await UserModel.create({
      name: 'Portal Callback User',
      emailOrPhone: 'portal-callback@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    const transaction = await PayTransactionModel.create({
      userId: user.id,
      amount: 2500,
      currency: 'KES',
      method: 'mpesa_stk',
      status: 'pending',
      ref: 'PORTAL-CALLBACK-REF',
      idempotencyKey: 'portal-callback-idempotency',
      purpose: 'booking_fee',
    });

    const callback = {
      providerRef: 'PORTAL-CALLBACK-REF',
      success: true,
      receipt: 'PORTAL-RECEIPT-001',
    };
    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', env.mpesa.callbackSecret)
      .send(callback)
      .expect(200);
    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', env.mpesa.callbackSecret)
      .send(callback)
      .expect(200);

    const updated = await PayTransactionModel.findById(transaction.id);
    const receipts = await PayReceiptModel.find({ transactionId: transaction.id });
    expect(updated?.status).toBe('paid');
    expect(updated?.receiptId).toBeDefined();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].receiptNumber).toBe('PORTAL-RECEIPT-001');
  });

  it('treats duplicate refund requests as an audited idempotent replay', async () => {
    if (shouldSkipDbTests()) return;
    env.payStepUpCode = 'test-step-up';
    const user = await UserModel.create({
      name: 'Refund Owner',
      emailOrPhone: 'refund-owner@test.com',
      password: 'secret123',
      role: 'user',
      kycStatus: 'verified',
    });
    await UserModel.create({
      name: 'Refund Admin',
      emailOrPhone: 'refund-admin@test.com',
      password: 'secret123',
      role: 'admin',
    });
    const adminToken = await loginPay('refund-admin@test.com', 'secret123');
    await request(app)
      .post('/api/pay/auth/step-up')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'test-step-up' })
      .expect(200);
    const transaction = await PayTransactionModel.create({
      userId: user.id,
      amount: 1000,
      currency: 'KES',
      method: 'mpesa_stk',
      status: 'paid',
      idempotencyKey: 'refund-replay-idempotency',
      purpose: 'deposit',
    });

    await request(app)
      .post(`/api/pay/admin/refund/${transaction.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const replay = await request(app)
      .post(`/api/pay/admin/refund/${transaction.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(replay.body.status).toBe('reversed');
    expect((await PayTransactionModel.findById(transaction.id))?.status).toBe('reversed');
    expect(
      await AuditLogModel.countDocuments({
        entityId: transaction.id,
        action: 'pay_refund_replay',
      })
    ).toBe(1);
  });
});
