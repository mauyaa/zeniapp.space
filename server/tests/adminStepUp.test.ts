import crypto from 'crypto';
import request from 'supertest';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { UserModel } from '../src/models/User';
import { AuthSessionModel } from '../src/models/AuthSession';
import { createAuthSession } from '../src/services/auth.service';
import { generateSecret } from '../src/utils/totp';
import { shouldSkipDbTests } from './skipDb';

let originalAdminOtp: string;
let originalAdminStepUpCode: string;
let originalNodeEnv: string;

function tokenForSecret(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = secret.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', Buffer.from(bytes)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

describe('admin step-up', () => {
  beforeAll(() => {
    originalAdminOtp = env.adminOtp;
    originalAdminStepUpCode = env.adminStepUpCode;
    originalNodeEnv = env.nodeEnv;
  });

  afterAll(() => {
    env.adminOtp = originalAdminOtp;
    env.adminStepUpCode = originalAdminStepUpCode;
    env.nodeEnv = originalNodeEnv;
  });

  it('accepts the legacy ADMIN_OTP fallback when ADMIN_STEP_UP_CODE is unset', async () => {
    if (shouldSkipDbTests()) return;

    env.adminStepUpCode = '';
    env.adminOtp = '246810';

    const admin = await UserModel.create({
      name: 'Fallback Admin',
      emailOrPhone: 'fallback-admin@test.com',
      password: 'secret123',
      role: 'admin',
    });

    const { accessToken, sessionId } = await createAuthSession(admin, {
      userAgent: 'jest',
      ip: '127.0.0.1',
    });

    await request(app)
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '246810' })
      .expect(200);

    const session = await AuthSessionModel.findById(sessionId).lean();
    expect(session?.stepUpVerifiedAt).toBeTruthy();
  });

  it('does not allow the configured step-up fallback to bypass enrolled MFA', async () => {
    if (shouldSkipDbTests()) return;

    env.adminOtp = '';
    env.adminStepUpCode = '135790';

    const admin = await UserModel.create({
      name: 'MFA Admin',
      emailOrPhone: 'mfa-admin@test.com',
      password: 'secret123',
      role: 'admin',
      mfaEnabled: true,
      mfaSecret: generateSecret(),
    });

    const { accessToken, sessionId } = await createAuthSession(admin, {
      userAgent: 'jest',
      ip: '127.0.0.1',
    });

    await request(app)
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '135790' })
      .expect(401);

    const session = await AuthSessionModel.findById(sessionId).lean();
    expect(session?.stepUpVerifiedAt).toBeFalsy();
  });

  it('requires step-up before a production admin can use a protected route', async () => {
    if (shouldSkipDbTests()) return;

    env.nodeEnv = 'production';
    env.adminStepUpCode = '246810';
    env.adminOtp = '';
    try {
      const admin = await UserModel.create({
        name: 'Protected Admin',
        emailOrPhone: 'protected-admin@test.com',
        password: 'secret123',
        role: 'admin',
      });
      const target = await UserModel.create({
        name: 'Protected Target',
        emailOrPhone: 'protected-target@test.com',
        password: 'secret123',
        role: 'user',
      });
      const { accessToken } = await createAuthSession(admin, {
        userAgent: 'jest',
        ip: '127.0.0.1',
      });

      const blocked = await request(app)
        .patch(`/api/admin/users/${target.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'suspended' })
        .expect(403);
      expect(blocked.body.code).toBe('STEP_UP_REQUIRED');

      await request(app)
        .post('/api/auth/step-up')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '246810' })
        .expect(200);

      await request(app)
        .patch(`/api/admin/users/${target.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'suspended' })
        .expect(200);
    } finally {
      env.nodeEnv = originalNodeEnv;
    }
  });

  it('stores MFA recovery codes hashed and consumes an audited recovery code during step-up', async () => {
    if (shouldSkipDbTests()) return;

    env.adminStepUpCode = '246810';
    env.adminOtp = '';
    const admin = await UserModel.create({
      name: 'Recovery Admin',
      emailOrPhone: 'recovery-admin@test.com',
      password: 'secret123',
      role: 'admin',
    });
    const { accessToken } = await createAuthSession(admin, {
      userAgent: 'jest',
      ip: '127.0.0.1',
    });
    await request(app)
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '246810' })
      .expect(200);

    const secret = generateSecret();
    const enabled = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ secret, token: tokenForSecret(secret) })
      .expect(200);
    const recoveryCodes = enabled.body.recoveryCodes as string[];
    expect(recoveryCodes).toHaveLength(6);

    const persisted = await UserModel.findById(admin.id).lean();
    expect(persisted?.mfaRecoveryCodes).toHaveLength(6);
    expect(persisted?.mfaRecoveryCodes?.every((code) => code.startsWith('sha256:'))).toBe(true);
    expect(persisted?.mfaRecoveryCodes).not.toContain(recoveryCodes[0]);

    await request(app)
      .post('/api/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: recoveryCodes[0] })
      .expect(200);
    const consumed = await UserModel.findById(admin.id).lean();
    expect(consumed?.mfaRecoveryCodes).toHaveLength(5);
  });
});
