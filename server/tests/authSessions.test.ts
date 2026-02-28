import request from 'supertest';
import { app } from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';

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

    const listAfter = await request(app).get('/api/auth/sessions').set('Authorization', `Bearer ${token}`).expect(200);
    expect((listAfter.body.sessions as SessionView[]).find((s) => s._id === sessionId)).toBeUndefined();
  });
});
