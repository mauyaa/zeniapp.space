/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { NotificationModel } from '../src/models/Notification';
import { signToken } from '../src/services/auth.service';
import { shouldSkipDbTests } from './skipDb';

describe('notifications', () => {
  let user: any;
  let agent: any;
  let admin: any;
  let listing: any;

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    user = await UserModel.create({ name: 'Buyer', emailOrPhone: 'buyer@test.com', password: 'secret123', role: 'user' });
    agent = await UserModel.create({
      name: 'Agent',
      emailOrPhone: 'agent@test.com',
      password: 'secret123',
      role: 'agent',
      agentVerification: 'verified'
    });
    admin = await UserModel.create({ name: 'Admin', emailOrPhone: 'admin@test.com', password: 'secret123', role: 'admin' });
    listing = await ListingModel.create({
      title: 'Test Listing',
      price: 100000,
      currency: 'KES',
      purpose: 'rent',
      status: 'live',
      verified: true,
      agentId: agent.id,
      location: { type: 'Point', coordinates: [36.8, -1.29] },
      images: []
    });
  });

  it('creates notification on chat message', async () => {
    if (shouldSkipDbTests()) return;
    const userToken = signToken(user);
    const convRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ listingId: listing.id, agentId: agent.id })
      .expect(201);

    await request(app)
      .post(`/api/conversations/${convRes.body.id}/messages`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ type: 'text', content: 'Hi there' })
      .expect(201);

    const note = await NotificationModel.findOne({ userId: agent.id, type: 'message' });
    expect(note).toBeTruthy();
    expect(note?.title).toBe('New message');
  });

  it('creates notification on viewing request', async () => {
    if (shouldSkipDbTests()) return;
    const userToken = signToken(user);
    await request(app)
      .post('/api/viewings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ listingId: listing.id, date: new Date(Date.now() + 25 * 60 * 60 * 1000) })
      .expect(201);

    const note = await NotificationModel.findOne({ userId: agent.id, type: 'viewing' });
    expect(note).toBeTruthy();
  });

  it('creates notification on listing moderation', async () => {
    if (shouldSkipDbTests()) return;
    const adminToken = signToken(admin);
    await request(app)
      .patch(`/api/admin/verification/listings/${listing.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'unlist' })
      .expect(200);

    const note = await NotificationModel.findOne({ userId: agent.id, title: 'Listing moderation' });
    expect(note).toBeTruthy();
  });

  it('marks notification as read via endpoint', async () => {
    if (shouldSkipDbTests()) return;
    const userToken = signToken(user);
    const note = await NotificationModel.create({
      userId: user.id,
      title: 'Test note',
      description: 'mark me',
      type: 'system'
    });

    const res = await request(app)
      .post(`/api/notifications/${note.id}/read`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.read).toBe(true);
    const refreshed = await NotificationModel.findById(note.id);
    expect(refreshed?.read).toBe(true);
  });
});
