import request from 'supertest';
import { sign } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { PayTransactionModel } from '../src/models/PayTransaction';
import { RefundRequestModel } from '../src/models/RefundRequest';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

describe('refund-requests', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let paidTxId: string;

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const [user, admin] = await Promise.all([
      UserModel.create({ name: 'RefundUser', emailOrPhone: 'refund@test.com', password: 'secret123', role: 'user' }),
      UserModel.create({ name: 'Admin', emailOrPhone: 'admin@test.com', password: 'secret123', role: 'admin' })
    ]);
    userId = String(user._id);
    userToken = sign({ sub: user.id, role: user.role }, env.jwtSecret);
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);

    const tx = await PayTransactionModel.create({
      userId: user._id,
      amount: 1000,
      currency: 'KES',
      method: 'mpesa_stk',
      status: 'paid',
      idempotencyKey: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      purpose: 'deposit'
    });
    paidTxId = String(tx._id);
  });

  it('GET /refund-requests/eligible returns paid transactions for user', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .get('/api/refund-requests/eligible')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((t: { _id: string }) => String(t._id) === paidTxId)).toBe(true);
  });

  it('POST /refund-requests creates request', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/refund-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ transactionId: paidTxId, reason: 'Landlord returned the deposit in full.' })
      .expect(201);

    expect(res.body.status).toBe('pending');
    expect(res.body.transactionId).toBeDefined();
    expect(res.body.reason).toContain('Landlord returned');

    const doc = await RefundRequestModel.findById(res.body._id);
    expect(doc?.userId.toString()).toBe(userId);
  });

  it('GET /refund-requests returns my requests', async () => {
    if (shouldSkipDbTests()) return;
    await RefundRequestModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      transactionId: new mongoose.Types.ObjectId(paidTxId),
      reason: 'Duplicate charge.',
      status: 'pending'
    });

    const res = await request(app)
      .get('/api/refund-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('admin GET /admin/refund-requests returns list', async () => {
    if (shouldSkipDbTests()) return;
    await RefundRequestModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      transactionId: new mongoose.Types.ObjectId(paidTxId),
      reason: 'Need refund.',
      status: 'pending'
    });

    const res = await request(app)
      .get('/api/admin/refund-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('admin PATCH /admin/refund-requests/:id resolves (approve)', async () => {
    if (shouldSkipDbTests()) return;
    const refReq = await RefundRequestModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      transactionId: new mongoose.Types.ObjectId(paidTxId),
      reason: 'Approved refund reason.',
      status: 'pending'
    });
    const id = String(refReq._id);

    const res = await request(app)
      .patch(`/api/admin/refund-requests/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved', adminNotes: 'Verified with landlord.' })
      .expect(200);

    expect(res.body.status).toBe('approved');
    expect(res.body.adminNotes).toContain('Verified');

    const tx = await PayTransactionModel.findById(paidTxId);
    expect(tx?.status).toBe('reversed');
  });

  it('admin PATCH reject does not reverse transaction', async () => {
    if (shouldSkipDbTests()) return;
    const refReq = await RefundRequestModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      transactionId: new mongoose.Types.ObjectId(paidTxId),
      reason: 'Rejected reason.',
      status: 'pending'
    });
    const id = String(refReq._id);

    const res = await request(app)
      .patch(`/api/admin/refund-requests/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected', adminNotes: 'No evidence.' })
      .expect(200);

    expect(res.body.status).toBe('rejected');
    const tx = await PayTransactionModel.findById(paidTxId);
    expect(tx?.status).toBe('paid');
  });
});
