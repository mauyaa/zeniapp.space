import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ConversationModel } from '../src/models/Conversation';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let token: string;
let agentId: string;
let adminId: string;
let userId: string;
let agentToken: string;
let conversationId: string;
let otherToken: string;
let adminToken: string;

type ConversationResponse = {
  userId: string;
  agentSnapshot?: { name?: string };
  userSnapshot?: { name?: string; role?: string };
};

describe('chat', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const agent = await UserModel.create({ name: 'Agent', emailOrPhone: 'agent@test.com', password: 'secret123', role: 'agent' });
    agentId = agent.id;
    agentToken = sign({ sub: agent.id, role: agent.role }, env.jwtSecret);
    const user = await UserModel.create({ name: 'User', emailOrPhone: 'user@test.com', password: 'secret123', role: 'user' });
    userId = user.id;
    token = sign({ sub: user.id, role: user.role }, env.jwtSecret);

    const other = await UserModel.create({ name: 'Other', emailOrPhone: 'other@test.com', password: 'secret123', role: 'user' });
    otherToken = sign({ sub: other.id, role: other.role }, env.jwtSecret);

    const admin = await UserModel.create({ name: 'Admin', emailOrPhone: 'admin@test.com', password: 'secret123', role: 'admin' });
    adminId = admin.id;
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

  it('allows admin to post in Zeni Admin support conversations', async () => {
    if (shouldSkipDbTests()) return;

    const zeniAdmin = await UserModel.create({
      name: 'Zeni Admin',
      emailOrPhone: 'support-admin@test.com',
      email: 'support-admin@test.com',
      password: 'secret123',
      role: 'agent',
    });

    const supportConversation = await ConversationModel.create({
      listingId: null,
      userId,
      agentId: zeniAdmin.id,
    });

    await request(app)
      .post(`/api/conversations/${supportConversation.id}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'text', content: 'Admin support reply' })
      .expect(201);
  });

  it('provisions exactly one Zeni Agent and one Zeni Admin thread for users', async () => {
    if (shouldSkipDbTests()) return;

    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId: '000000000000000000000001', agentId })
      .expect(201);

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const names = (response.body as ConversationResponse[]).map(
      (conversation) => conversation.agentSnapshot?.name
    );
    expect(names.filter((name) => name === 'Zeni Agent')).toHaveLength(1);
    expect(names.filter((name) => name === 'Zeni Admin')).toHaveLength(1);
  });

  it('hides the legacy Zeni Admin self-thread from the admin portal', async () => {
    if (shouldSkipDbTests()) return;

    const zeniAdmin = await UserModel.create({
      name: 'Zeni Admin',
      emailOrPhone: 'legacy-admin-channel@test.com',
      email: 'legacy-admin-channel@test.com',
      password: 'secret123',
      role: 'agent',
    });

    await ConversationModel.create({
      listingId: null,
      userId: adminId,
      agentId: zeniAdmin.id,
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const names = (response.body as ConversationResponse[]).map(
      (conversation) => conversation.agentSnapshot?.name
    );
    expect(names).not.toContain('Zeni Admin');
    expect(names.filter((name) => name === 'Zeni Agent')).toHaveLength(1);
  });

  it('shows user support conversations in the admin portal', async () => {
    if (shouldSkipDbTests()) return;

    const zeniAdmin = await UserModel.create({
      name: 'Zeni Admin',
      emailOrPhone: 'admin-support-portal@test.com',
      email: 'admin-support-portal@test.com',
      password: 'secret123',
      role: 'agent',
    });

    await ConversationModel.create({
      listingId: null,
      userId,
      agentId: zeniAdmin.id,
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const userRows = (response.body as ConversationResponse[]).filter(
      (conversation) => conversation.userSnapshot?.role === 'user'
    );

    expect(userRows.map((conversation) => conversation.userSnapshot?.name)).toContain('User');
  });

  it('shows only one internal Zeni Admin thread for agents', async () => {
    if (shouldSkipDbTests()) return;

    const [zeniSupport, zeniAdmin] = await Promise.all([
      UserModel.create({
        name: 'Zeni Support',
        emailOrPhone: 'legacy-support-channel@test.com',
        email: 'legacy-support-channel@test.com',
        password: 'secret123',
        role: 'agent',
      }),
      UserModel.create({
        name: 'Zeni Admin',
        emailOrPhone: 'legacy-agent-admin@test.com',
        email: 'legacy-agent-admin@test.com',
        password: 'secret123',
        role: 'agent',
      }),
    ]);

    await ConversationModel.create({
      listingId: null,
      userId: agentId,
      agentId: zeniSupport.id,
    });

    await ConversationModel.create({
      listingId: null,
      userId: agentId,
      agentId: zeniAdmin.id,
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    const internalNames = (response.body as ConversationResponse[])
      .filter((conversation) => conversation.userId === agentId)
      .map((conversation) => conversation.agentSnapshot?.name);

    expect(internalNames.filter((name) => name === 'Zeni Support')).toHaveLength(0);
    expect(internalNames.filter((name) => name === 'Zeni Admin')).toHaveLength(1);
  });

  it('collapses the seeded admin user and internal Zeni Admin into one agent inbox row', async () => {
    if (shouldSkipDbTests()) return;

    const seededAdminUser = await UserModel.findById(adminId);
    if (!seededAdminUser) throw new Error('Missing admin user');
    seededAdminUser.name = 'Zeni Admin';
    await seededAdminUser.save();

    const zeniAdmin = await UserModel.create({
      name: 'Zeni Admin',
      emailOrPhone: 'agent-internal-admin@test.com',
      email: 'agent-internal-admin@test.com',
      password: 'secret123',
      role: 'agent',
    });

    await ConversationModel.create({
      listingId: null,
      userId: agentId,
      agentId: zeniAdmin.id,
    });

    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ listingId: '000000000000000000000003', agentId })
      .expect(201);

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    const names = (response.body as ConversationResponse[]).map((conversation) =>
      conversation.userSnapshot?.role === 'admin'
        ? conversation.userSnapshot?.name
        : conversation.agentSnapshot?.name
    );

    expect(names.filter((name) => name === 'Zeni Admin')).toHaveLength(1);
  });
});
