import request from 'supertest';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { PayTransactionModel } from '../src/models/PayTransaction';
import { shouldSkipDbTests } from './skipDb';

async function loginPay(emailOrPhone: string, password: string) {
  const res = await request(app)
    .post('/api/pay/auth/login')
    .send({ emailOrPhone, password })
    .expect(200);
  return res.body.accessToken as string;
}

describe('pay portal', () => {
  it('blocks suspended users from pay APIs', async () => {
    if (shouldSkipDbTests()) return;
    const user = await UserModel.create({
      name: 'Suspended User',
      emailOrPhone: 'suspended@pay.test',
      password: 'secret123',
      role: 'user'
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
      role: 'user'
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
});

