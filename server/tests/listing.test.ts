import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let token: string;

describe('listings', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const agent = await UserModel.create({
      name: 'Agent',
      emailOrPhone: 'a@a.com',
      password: 'secret123',
      role: 'agent',
      agentVerification: 'verified'
    });
    token = sign({ sub: agent.id, role: agent.role }, env.jwtSecret);
  });

  it('creates listing as agent', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/agent/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', price: 100, location: { coordinates: [0, 0] } })
      .expect(201);
  });
});
