import request from 'supertest';
import { decode } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

describe('auth', () => {
  it('registers and logs in', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', emailOrPhone: 'test@test.com', password: 'secret123' })
      .expect(200);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'test@test.com', password: 'secret123' })
      .expect(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toContain('refreshToken=');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(res.body.user.role).toBe('user');
  });

  it('issues access tokens with a short lifetime', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Token', emailOrPhone: 'short-token@test.com', password: 'secret123' })
      .expect(200);
    const payload = decode(res.body.token) as { iat?: number; exp?: number } | null;
    expect(payload?.iat).toBeDefined();
    expect(payload?.exp).toBeDefined();
    expect((payload?.exp || 0) - (payload?.iat || 0)).toBeLessThanOrEqual(15 * 60);
  });

  it('returns an explicit refresh token only for native token transport', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Auth-Storage', 'token')
      .send({ name: 'Native', emailOrPhone: 'native@test.com', password: 'secret123' })
      .expect(200);
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rotates refresh tokens and rejects reuse of an old token', async () => {
    if (shouldSkipDbTests()) return;
    const initial = await request(app)
      .post('/api/auth/register')
      .set('X-Auth-Storage', 'token')
      .send({ name: 'Rotate', emailOrPhone: 'rotate@test.com', password: 'secret123' })
      .expect(200);
    const oldRefresh = initial.body.refreshToken as string;

    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('X-Auth-Storage', 'token')
      .set('X-Refresh-Token', oldRefresh)
      .expect(200);
    expect(rotated.body.refreshToken).toBeDefined();
    expect(rotated.body.refreshToken).not.toBe(oldRefresh);

    const reuse = await request(app)
      .post('/api/auth/refresh')
      .set('X-Auth-Storage', 'token')
      .set('X-Refresh-Token', oldRefresh)
      .expect(401);
    expect(reuse.body.code).toBe('REFRESH_TOKEN_REUSED');

    await request(app)
      .post('/api/auth/refresh')
      .set('X-Auth-Storage', 'token')
      .set('X-Refresh-Token', rotated.body.refreshToken)
      .expect(401);
  });

  it('logs out and rejects the former refresh token', async () => {
    if (shouldSkipDbTests()) return;
    const registered = await request(app)
      .post('/api/auth/register')
      .set('X-Auth-Storage', 'token')
      .send({ name: 'Logout', emailOrPhone: 'logout@test.com', password: 'secret123' })
      .expect(200);
    const refreshToken = registered.body.refreshToken as string;

    await request(app).post('/api/auth/logout').set('X-Refresh-Token', refreshToken).expect(204);
    await request(app).post('/api/auth/refresh').set('X-Refresh-Token', refreshToken).expect(401);
  });

  it('resets a password once and revokes sessions created before reset', async () => {
    if (shouldSkipDbTests()) return;
    const registered = await request(app)
      .post('/api/auth/register')
      .set('X-Auth-Storage', 'token')
      .send({ name: 'Reset', emailOrPhone: 'reset@test.com', password: 'secret123' })
      .expect(200);

    const forgot = await request(app)
      .post('/api/auth/password/forgot')
      .send({ emailOrPhone: 'reset@test.com' })
      .expect(202);
    expect(forgot.body.resetToken).toBeDefined();

    await request(app)
      .post('/api/auth/password/reset')
      .send({ token: forgot.body.resetToken, password: 'changedSecret123' })
      .expect(200);

    await request(app)
      .post('/api/auth/refresh')
      .set('X-Refresh-Token', registered.body.refreshToken)
      .expect(401);
    await request(app)
      .post('/api/auth/password/reset')
      .send({ token: forgot.body.resetToken, password: 'againSecret123' })
      .expect(400);
    await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: 'reset@test.com', password: 'changedSecret123' })
      .expect(200);
  });

  it('ignores privileged role on registration', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Finance',
        emailOrPhone: 'finance@test.com',
        password: 'secret123',
        role: 'finance',
      })
      .expect(200);
    expect(res.body.user.role).toBe('user');
    const created = await UserModel.findOne({ emailOrPhone: 'finance@test.com' });
    expect(created?.role).toBe('user');
  });

  it('does not grant admin access through a consumer email domain configuration', async () => {
    if (shouldSkipDbTests()) return;
    const previousEnabled = env.allowPrivilegedSignup;
    const previousDomains = [...env.adminDomains];
    env.allowPrivilegedSignup = true;
    env.adminDomains = ['gmail.com'];
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Consumer',
          emailOrPhone: 'someone@gmail.com',
          password: 'secret123',
          role: 'admin',
        })
        .expect(200);
      expect(res.body.user.role).toBe('user');
    } finally {
      env.allowPrivilegedSignup = previousEnabled;
      env.adminDomains = previousDomains;
    }
  });
});
