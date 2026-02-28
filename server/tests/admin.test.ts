import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let adminToken: string;
let userToken: string;

describe('admin analytics', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const admin = await UserModel.create({ name: 'Admin', emailOrPhone: 'admin@test.com', password: 'secret123', role: 'admin' });
    const user = await UserModel.create({ name: 'User', emailOrPhone: 'user@test.com', password: 'secret123', role: 'user' });
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);
    userToken = sign({ sub: user.id, role: user.role }, env.jwtSecret);
  });

  it('gets overview', async () => {
    if (shouldSkipDbTests()) return;
    await request(app).get('/api/admin/analytics/overview').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });

  it('blocks non-admin audit access', async () => {
    if (shouldSkipDbTests()) return;
    await request(app).get('/api/admin/audit').set('Authorization', `Bearer ${userToken}`).expect(403);
  });
});
