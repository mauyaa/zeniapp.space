import request from 'supertest';
import { app } from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';
import { AuthSessionModel } from '../src/models/AuthSession';

type SessionView = { _id: string };

describe('auth sessions management', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await disconnectDB();
  });

  it('lists and revokes sessions', async () => {
    const user = await UserModel.create({
      name: 'Sess Tester',
      emailOrPhone: 'sess@test.com',
      password: 'Secret123!',
      role: 'user'
    });
    const login = await request(app).post('/api/auth/login').send({ emailOrPhone: user.emailOrPhone, password: 'Secret123!' });
    const token = login.body.token;

    const list = await request(app).get('/api/auth/sessions').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(list.body.sessions)).toBe(true);
    expect(list.body.sessions.length).toBeGreaterThanOrEqual(1);

    const sessionId = list.body.sessions[0]._id;
    await request(app).delete(`/api/auth/sessions/${sessionId}`).set('Authorization', `Bearer ${token}`).expect(204);

    // Revoking the current session must invalidate the current access token immediately.
    await request(app).get('/api/auth/sessions').set('Authorization', `Bearer ${token}`).expect(401);

    // A new login gets a fresh session and should not show the revoked one.
    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: user.emailOrPhone, password: 'Secret123!' })
      .expect(200);
    const reloginToken = relogin.body.token;
    const listAfter = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${reloginToken}`)
      .expect(200);
    expect((listAfter.body.sessions as SessionView[]).find((s) => s._id === sessionId)).toBeUndefined();
  });

  it('invalidates access token once the backing session is revoked', async () => {
    const user = await UserModel.create({
      name: 'Sess Revoke Tester',
      emailOrPhone: 'sess-revoke@test.com',
      password: 'Secret123!',
      role: 'user',
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: user.emailOrPhone, password: 'Secret123!' })
      .expect(200);
    const token = login.body.token as string;

    const list = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sessionId = (list.body.sessions as SessionView[])[0]?._id;
    expect(sessionId).toBeDefined();

    await request(app)
      .delete(`/api/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('rejects access tokens whose session has expired and removes stale session', async () => {
    const user = await UserModel.create({
      name: 'Sess Expire Tester',
      emailOrPhone: 'sess-expire@test.com',
      password: 'Secret123!',
      role: 'user',
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: user.emailOrPhone, password: 'Secret123!' })
      .expect(200);
    const token = login.body.token as string;

    const list = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sessionId = (list.body.sessions as SessionView[])[0]?._id;
    expect(sessionId).toBeDefined();

    await AuthSessionModel.findByIdAndUpdate(sessionId, {
      expiresAt: new Date(Date.now() - 60_000),
    });

    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);

    const stale = await AuthSessionModel.findById(sessionId);
    expect(stale).toBeNull();
  });
});
