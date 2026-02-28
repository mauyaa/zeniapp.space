/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { NotificationModel } from '../src/models/Notification';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

describe('moderation queue and KYC / business verify', () => {
  let adminToken: string;
  let userToken: string;
  let agentToken: string;
  let admin: any;
  let user: any;
  let agent: any;

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    admin = await UserModel.create({
      name: 'Admin',
      emailOrPhone: 'admin-mq@test.com',
      password: 'secret123',
      role: 'admin'
    });
    user = await UserModel.create({
      name: 'User',
      emailOrPhone: 'user-mq@test.com',
      password: 'secret123',
      role: 'user'
    });
    agent = await UserModel.create({
      name: 'Agent',
      emailOrPhone: 'agent-mq@test.com',
      password: 'secret123',
      role: 'agent',
      agentVerification: 'pending'
    });
    adminToken = sign({ sub: admin._id.toString(), role: admin.role }, env.jwtSecret);
    userToken = sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret);
    agentToken = sign({ sub: agent._id.toString(), role: agent.role }, env.jwtSecret);
  });

  it('GET /admin/moderation/queue returns 200 and array (admin only)', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .get('/api/admin/moderation/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const agentItem = res.body.find((i: any) => i.type === 'agent_verify' && i.id === agent._id.toString());
    expect(agentItem).toBeTruthy();
    expect(agentItem.requestType).toBe('Agent Verify');
    expect(agentItem.userEntity.name).toBe('Agent');
  });

  it('blocks non-admin from moderation queue', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .get('/api/admin/moderation/queue')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('user can submit KYC and admin can resolve', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/user/kyc')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ url: 'https://example.com/id.jpg', note: 'ID front' })
      .expect(201);

    const u = await UserModel.findById(user._id).select('kycStatus kycEvidence').lean();
    expect(u?.kycStatus).toBe('pending');
    expect((u as any)?.kycEvidence?.length).toBeGreaterThanOrEqual(1);

    await request(app)
      .patch(`/api/admin/verification/kyc/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve' })
      .expect(200);

    const u2 = await UserModel.findById(user._id).select('kycStatus').lean();
    expect(u2?.kycStatus).toBe('verified');

    const note = await NotificationModel.findOne({ userId: user._id, title: 'Identity verified' });
    expect(note).toBeTruthy();
    expect(note?.description).toContain('verified');
  });

  it('agent can submit business verify and admin can resolve', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/agent/verification/business')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ url: 'https://example.com/biz.pdf', note: 'Registration' })
      .expect(201);

    const a = await UserModel.findById(agent._id).select('businessVerifyStatus businessVerifyEvidence').lean();
    expect((a as any)?.businessVerifyStatus).toBe('pending');
    expect((a as any)?.businessVerifyEvidence?.length).toBeGreaterThanOrEqual(1);

    await request(app)
      .patch(`/api/admin/verification/business/${agent._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve' })
      .expect(200);

    const a2 = await UserModel.findById(agent._id).select('businessVerifyStatus').lean();
    expect((a2 as any)?.businessVerifyStatus).toBe('verified');
  });

  it('moderation queue includes new_listing when listing is pending_review', async () => {
    if (shouldSkipDbTests()) return;
    const listing = await ListingModel.create({
      title: 'Pending Listing',
      price: 50000,
      currency: 'KES',
      purpose: 'rent',
      status: 'pending_review',
      agentId: agent._id,
      location: { type: 'Point', coordinates: [36.8, -1.29] },
      images: []
    });

    const res = await request(app)
      .get('/api/admin/moderation/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const listingItem = res.body.find((i: any) => i.type === 'new_listing' && i.id === listing._id.toString());
    expect(listingItem).toBeTruthy();
    expect(listingItem.requestType).toBe('New Listing');

    await request(app)
      .patch(`/api/admin/verification/listings/${listing._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' })
      .expect(200);

    const res2 = await request(app)
      .get('/api/admin/moderation/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const stillInQueue = res2.body.find((i: any) => i.type === 'new_listing' && i.id === listing._id.toString());
    expect(stillInQueue).toBeFalsy();

    const updated = await ListingModel.findById(listing._id).lean();
    expect((updated as any)?.status).toBe('live');
  });
});
