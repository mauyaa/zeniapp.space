import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let adminToken: string;
let originalAdminRequireTailnet: boolean;
let originalPayAdminRequireTailnet: boolean;
let originalEnforceInTest: string | undefined;
let originalAdminOtp: string;
let originalAdminDomains: string[];
let originalAdminDomain: string;
let originalTrustProxy: boolean | number | string;

describe('network access controls', () => {
  beforeAll(() => {
    originalAdminRequireTailnet = env.adminRequireTailnet;
    originalPayAdminRequireTailnet = env.payAdminRequireTailnet;
    originalEnforceInTest = process.env.ENFORCE_NETWORK_ACCESS_IN_TEST;
    originalAdminOtp = env.adminOtp;
    originalAdminDomains = [...env.adminDomains];
    originalAdminDomain = env.adminDomain;
    originalTrustProxy = app.get('trust proxy');
  });

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    env.adminRequireTailnet = false;
    env.payAdminRequireTailnet = false;
    process.env.ENFORCE_NETWORK_ACCESS_IN_TEST = 'false';

    const admin = await UserModel.create({
      name: 'Network Admin',
      emailOrPhone: 'network-admin@test.com',
      password: 'secret123',
      role: 'admin'
    });
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);
  });

  afterAll(() => {
    env.adminRequireTailnet = originalAdminRequireTailnet;
    env.payAdminRequireTailnet = originalPayAdminRequireTailnet;
    env.adminOtp = originalAdminOtp;
    env.adminDomains = [...originalAdminDomains];
    env.adminDomain = originalAdminDomain;
    app.set('trust proxy', originalTrustProxy);
    if (originalEnforceInTest === undefined) {
      delete process.env.ENFORCE_NETWORK_ACCESS_IN_TEST;
    } else {
      process.env.ENFORCE_NETWORK_ACCESS_IN_TEST = originalEnforceInTest;
    }
  });

  it('returns read-only network access status for admins', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app).get('/api/admin/network-access').set('Authorization', `Bearer ${adminToken}`).expect(200);

    expect(res.body.policy).toBeDefined();
    expect(res.body.policy.enforcement).toBeDefined();
    expect(res.body.request).toBeDefined();
    expect(Array.isArray(res.body.recentDecisions)).toBe(true);
  });

  it('blocks admin routes when tailnet is required and request is off-tailnet', async () => {
    if (shouldSkipDbTests()) return;
    process.env.ENFORCE_NETWORK_ACCESS_IN_TEST = 'true';
    env.adminRequireTailnet = true;

    const res = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(['TAILNET_REQUIRED', 'IP_NOT_ALLOWED']).toContain(res.body.code);
  });

  it('blocks pay-admin routes when pay tailnet is required and request is off-tailnet', async () => {
    if (shouldSkipDbTests()) return;
    process.env.ENFORCE_NETWORK_ACCESS_IN_TEST = 'true';
    env.payAdminRequireTailnet = true;

    const res = await request(app)
      .get('/api/pay/admin/reconciliation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(['TAILNET_REQUIRED', 'IP_NOT_ALLOWED']).toContain(res.body.code);
  });

  it('allows admin login from a tailnet IP when tailnet enforcement is enabled', async () => {
    if (shouldSkipDbTests()) return;
    process.env.ENFORCE_NETWORK_ACCESS_IN_TEST = 'true';
    env.adminRequireTailnet = true;
    env.adminOtp = '000000';
    env.adminDomains = ['*'];
    env.adminDomain = '*';
    app.set('trust proxy', 1);

    await UserModel.create({
      name: 'Tailnet Login Admin',
      emailOrPhone: 'tailnet-admin@zeni.test',
      password: 'secret123',
      role: 'admin'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .set('x-forwarded-for', '100.100.100.10')
      .send({ emailOrPhone: 'tailnet-admin@zeni.test', password: 'secret123', otp: '000000' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user?.role).toBe('admin');
  });
});
