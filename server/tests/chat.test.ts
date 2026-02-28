import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let token: string;
let agentId: string;
let agentToken: string;
let conversationId: string;
let otherToken: string;
let adminToken: string;

describe('chat', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const agent = await UserModel.create({ name: 'Agent', emailOrPhone: 'agent@test.com', password: 'secret123', role: 'agent' });
    agentId = agent.id;
    agentToken = sign({ sub: agent.id, role: agent.role }, env.jwtSecret);
    const user = await UserModel.create({ name: 'User', emailOrPhone: 'user@test.com', password: 'secret123', role: 'user' });
    token = sign({ sub: user.id, role: user.role }, env.jwtSecret);

    const other = await UserModel.create({ name: 'Other', emailOrPhone: 'other@test.com', password: 'secret123', role: 'user' });
    otherToken = sign({ sub: other.id, role: other.role }, env.jwtSecret);

    const admin = await UserModel.create({ name: 'Admin', emailOrPhone: 'admin@test.com', password: 'secret123', role: 'admin' });
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);

    const { body } = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId: '000000000000000000000000', agentId })
      .expect(201);

    conversationId = body._id ?? body.id;
  });

  it('creates conversation', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId: '000000000000000000000001', agentId })
      .expect(201);
  });

  it('allows participant to send message', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: 'Hello' })
      .expect(201);
  });

  it('allows the agent to post in the same conversation', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ type: 'text', content: 'Agent update' })
      .expect(201);
  });

  it('allows agent to update lead stage', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ leadStage: 'contacted' })
      .expect(200);

    expect(res.body.leadStage).toBe('contacted');
  });

  it('rejects posting from another user', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ type: 'text', content: 'Hijack' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('rejects admin posting in a conversation they are not part of', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'text', content: 'Admin follow-up' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('allows admin to post in a conversation where admin is a participant', async () => {
    if (shouldSkipDbTests()) return;
    const { body } = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ listingId: '000000000000000000000002', agentId })
      .expect(201);

    const adminConversationId = body._id ?? body.id;

    await request(app)
      .post(`/api/conversations/${adminConversationId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'text', content: 'Admin to agent' })
      .expect(201);
  });
});
