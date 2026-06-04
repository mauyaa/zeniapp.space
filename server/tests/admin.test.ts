import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { AuditLogModel } from '../src/models/AuditLog';
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

  it('grants and revokes privileged roles only through audited admin action', async () => {
    if (shouldSkipDbTests()) return;
    const target = await UserModel.create({
      name: 'Target',
      emailOrPhone: 'target@test.com',
      password: 'secret123',
      role: 'user',
    });

    await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect((await UserModel.findById(target.id))?.role).toBe('admin');

    await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' })
      .expect(200);
    expect((await UserModel.findById(target.id))?.role).toBe('user');
    expect(await AuditLogModel.countDocuments({ entityId: target.id, action: 'privileged_role_grant' })).toBe(1);
    expect(await AuditLogModel.countDocuments({ entityId: target.id, action: 'privileged_role_revoke' })).toBe(1);
  });
});
