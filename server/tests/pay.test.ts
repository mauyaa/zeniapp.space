import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { InvoiceModel } from '../src/models/Invoice';
import { PaymentTransactionModel } from '../src/models/PaymentTransaction';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let token: string;
let invoiceId: string;

describe('pay', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({ name: 'User', emailOrPhone: 'user@test.com', password: 'secret123', role: 'user' });
    token = sign({ sub: user.id, role: user.role }, env.jwtSecret);
    const inv = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 1000,
      status: 'unpaid',
      dueDate: new Date()
    });
    invoiceId = inv.id;
  });

  it('initiates stk', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/pay/mpesa/stk/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId, phone: '0712345678' })
      .expect(201);
  });
});

describe('mpesa callback security', () => {
  const callbackSecret = 'test-callback-secret';
  const originalSecret = env.mpesa.callbackSecret;

  beforeAll(async () => {
    if (shouldSkipDbTests()) return;
    env.mpesa.callbackSecret = callbackSecret;
    await UserModel.deleteMany({});
    await InvoiceModel.deleteMany({});
    await PaymentTransactionModel.deleteMany({});
  });

  afterAll(() => {
    env.mpesa.callbackSecret = originalSecret;
  });

  it('accepts callbacks signed with the configured secret', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({ name: 'CallbackUser', emailOrPhone: 'callback@test.com', password: 'secret123', role: 'user' });
    const invoice = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 2000,
      status: 'unpaid',
      dueDate: new Date(),
      lineItems: []
    });

    const tx = await PaymentTransactionModel.create({
      invoiceId: invoice.id,
      userId: user.id,
      method: 'mpesa_stk',
      amount: invoice.amount,
      status: 'pending',
      provider: 'mpesa',
      providerRef: 'CALLBACK-REF',
      phone: '0712345678',
      idempotencyKey: 'callback-test'
    });

    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', callbackSecret)
      .send({ providerRef: tx.providerRef, success: true, receipt: 'RCPT123' })
      .expect(200);

    const updatedTx = await PaymentTransactionModel.findById(tx.id);
    expect(updatedTx?.status).toBe('paid');

    const paidInvoice = await InvoiceModel.findById(invoice.id);
    expect(paidInvoice?.status).toBe('paid');
  });

  it('accepts Daraja STK callback payload shape', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({ name: 'CallbackUserDaraja', emailOrPhone: 'callback-daraja@test.com', password: 'secret123', role: 'user' });
    const invoice = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 2500,
      status: 'unpaid',
      dueDate: new Date(),
      lineItems: []
    });

    const tx = await PaymentTransactionModel.create({
      invoiceId: invoice.id,
      userId: user.id,
      method: 'mpesa_stk',
      amount: invoice.amount,
      status: 'pending',
      provider: 'mpesa',
      providerRef: 'DARAJA-REF',
      phone: '0712345678',
      idempotencyKey: 'callback-test-daraja'
    });

    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', callbackSecret)
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: tx.providerRef,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 2500 },
                { Name: 'MpesaReceiptNumber', Value: 'DARAJA-RCPT-001' },
                { Name: 'Balance' },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      })
      .expect(200);

    const updatedTx = await PaymentTransactionModel.findById(tx.id);
    expect(updatedTx?.status).toBe('paid');
    expect(updatedTx?.receiptNumber).toBe('DARAJA-RCPT-001');
  });

  it('marks a failure callback as failed and leaves the invoice unpaid', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({ name: 'CallbackUser2', emailOrPhone: 'callback2@test.com', password: 'secret123', role: 'user' });
    const invoice = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 1500,
      status: 'unpaid',
      dueDate: new Date(),
      lineItems: []
    });

    const tx = await PaymentTransactionModel.create({
      invoiceId: invoice.id,
      userId: user.id,
      method: 'mpesa_stk',
      amount: invoice.amount,
      status: 'pending',
      provider: 'mpesa',
      providerRef: 'CALLBACK-FAIL',
      phone: '0712345678',
      idempotencyKey: 'callback-test-failure'
    });

    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', callbackSecret)
      .send({ providerRef: tx.providerRef, success: false })
      .expect(200);

    const failedTx = await PaymentTransactionModel.findById(tx.id);
    expect(failedTx?.status).toBe('failed');

    const failedInvoice = await InvoiceModel.findById(invoice.id);
    expect(failedInvoice?.status).toBe('unpaid');
  });

  it('ignores invalid transition callbacks after a transaction is already paid', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({ name: 'CallbackUser3', emailOrPhone: 'callback3@test.com', password: 'secret123', role: 'user' });
    const invoice = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 1800,
      status: 'unpaid',
      dueDate: new Date(),
      lineItems: []
    });

    const tx = await PaymentTransactionModel.create({
      invoiceId: invoice.id,
      userId: user.id,
      method: 'mpesa_stk',
      amount: invoice.amount,
      status: 'pending',
      provider: 'mpesa',
      providerRef: 'CALLBACK-TRANSITION',
      phone: '0712345678',
      idempotencyKey: 'callback-transition'
    });

    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', callbackSecret)
      .send({ providerRef: tx.providerRef, success: true, receipt: 'RCPT-PAID' })
      .expect(200);

    await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', callbackSecret)
      .send({ providerRef: tx.providerRef, success: false })
      .expect(200);

    const after = await PaymentTransactionModel.findById(tx.id);
    expect(after?.status).toBe('paid');
  });

  it('rejects callbacks with invalid signature', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post('/api/pay/mpesa/callback')
      .set('x-callback-secret', 'wrong-secret')
      .send({ providerRef: 'does-not-matter', success: true });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_SIGNATURE');
  });
});
