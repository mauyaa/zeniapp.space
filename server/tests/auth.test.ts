import request from 'supertest';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { shouldSkipDbTests } from './skipDb';

describe('auth', () => {
  it('registers and logs in', async () => {
    if (shouldSkipDbTests()) return;
    await request(app).post('/api/auth/register').send({ name: 'Test', emailOrPhone: 'test@test.com', password: 'secret123' }).expect(200);
    const res = await request(app).post('/api/auth/login').send({ emailOrPhone: 'test@test.com', password: 'secret123' }).expect(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('user');
  });

  it('ignores privileged role on registration', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Finance', emailOrPhone: 'finance@test.com', password: 'secret123', role: 'finance' })
      .expect(200);
    expect(res.body.user.role).toBe('user');
    const created = await UserModel.findOne({ emailOrPhone: 'finance@test.com' });
    expect(created?.role).toBe('user');
  });
});
