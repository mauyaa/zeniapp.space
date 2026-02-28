import request from 'supertest';
import { sign } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { ViewingRequestModel } from '../src/models/ViewingRequest';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

describe('viewings', () => {
  let userToken: string;
  let userId: string;
  let agentId: string;
  let listingId: string;
  const viewingDate = new Date(Date.now() + 25 * 60 * 60 * 1000); // 25h from now

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const [user, agent] = await Promise.all([
      UserModel.create({ name: 'Tenant', emailOrPhone: 'tenant@test.com', password: 'secret123', role: 'user' }),
      UserModel.create({ name: 'Agent', emailOrPhone: 'agent@test.com', password: 'secret123', role: 'agent', agentVerification: 'verified' })
    ]);
    userId = String(user._id);
    userToken = sign({ sub: user.id, role: user.role }, env.jwtSecret);
    agentId = String(agent._id);
    const listing = await ListingModel.create({
      title: 'Test Listing',
      price: 50000,
      currency: 'KES',
      purpose: 'rent',
      status: 'live',
      agentId: agent._id,
      location: { type: 'Point', coordinates: [36.8, -1.3] },
      images: [{ url: 'https://example.com/1.jpg' }],
      verified: true
    });
    listingId = String(listing._id);
  });

  it('creates viewing and returns needsViewingFee when VIEWING_FEE_AMOUNT > 0', async () => {
    if (shouldSkipDbTests()) return;
    const res = await request(app)
      .post('/api/viewings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        listingId,
        date: viewingDate.toISOString(),
        note: 'Test viewing'
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.listingId).toBe(listingId);
    expect(res.body.status).toBe('requested');
    if (env.viewingFeeAmount > 0) {
      expect(res.body.needsViewingFee).toBe(true);
      expect(res.body.viewingFeeAmount).toBe(env.viewingFeeAmount);
    }
  });

  it('lists my viewings', async () => {
    if (shouldSkipDbTests()) return;
    await request(app)
      .post('/api/viewings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ listingId, date: viewingDate.toISOString() })
      .expect(201);

    const res = await request(app)
      .get('/api/viewings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('confirm-completed requires viewing status completed and fee held', async () => {
    if (shouldSkipDbTests()) return;
    const viewing = await ViewingRequestModel.create({
      listingId: new mongoose.Types.ObjectId(listingId),
      agentId: new mongoose.Types.ObjectId(agentId),
      userId: new mongoose.Types.ObjectId(userId),
      date: viewingDate,
      status: 'completed',
      viewingFeeStatus: 'held',
      viewingFeeAmount: 500
    });
    const id = String(viewing._id);

    const res = await request(app)
      .patch(`/api/viewings/${id}/confirm-completed`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.viewingFeeStatus).toBe('released');
    expect(res.body.tenantConfirmedAt).toBeDefined();

    const updated = await ViewingRequestModel.findById(id);
    expect(updated?.viewingFeeStatus).toBe('released');
  });

  it('confirm-completed returns 409 when status is not completed', async () => {
    if (shouldSkipDbTests()) return;
    const viewing = await ViewingRequestModel.create({
      listingId: new mongoose.Types.ObjectId(listingId),
      agentId: new mongoose.Types.ObjectId(agentId),
      userId: new mongoose.Types.ObjectId(userId),
      date: viewingDate,
      status: 'requested',
      viewingFeeStatus: 'held',
      viewingFeeAmount: 500
    });
    const id = String(viewing._id);

    await request(app)
      .patch(`/api/viewings/${id}/confirm-completed`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(409);
  });
});
