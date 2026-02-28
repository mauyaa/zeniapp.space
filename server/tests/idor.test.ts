/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { ViewingRequestModel } from '../src/models/ViewingRequest';
import { ReportModel } from '../src/models/Report';
import { signToken } from '../src/services/auth.service';
import { shouldSkipDbTests } from './skipDb';

describe('IDOR / ownership protections', () => {
  let userA: any;
  let userB: any;
  let agentA: any;
  let agentB: any;
  let listingA: any;
  let viewing: any;
  let report: any;

  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    userA = await UserModel.create({ name: 'User A', emailOrPhone: 'a@test.com', password: 'secret123' });
    userB = await UserModel.create({ name: 'User B', emailOrPhone: 'b@test.com', password: 'secret123' });
    agentA = await UserModel.create({ name: 'Agent A', emailOrPhone: 'agenta@test.com', password: 'secret123', role: 'agent', agentVerification: 'verified' });
    agentB = await UserModel.create({ name: 'Agent B', emailOrPhone: 'agentb@test.com', password: 'secret123', role: 'agent', agentVerification: 'verified' });
    listingA = await ListingModel.create({
      title: 'Test Listing',
      price: 100000,
      currency: 'KES',
      purpose: 'rent',
      status: 'live',
      agentId: agentA.id,
      location: { type: 'Point', coordinates: [36.8, -1.29] },
      images: []
    });
    viewing = await ViewingRequestModel.create({
      listingId: listingA.id,
      agentId: agentA.id,
      userId: userA.id,
      date: new Date(Date.now() + 3600 * 1000),
      status: 'requested'
    });
    report = await ReportModel.create({
      reporterId: userA.id,
      targetType: 'listing',
      targetId: listingA.id,
      category: 'scam',
      severity: 'medium',
      status: 'open'
    });
  });

  it('prevents user from fetching another user viewing', async () => {
    if (shouldSkipDbTests()) return;
    const tokenB = signToken(userB);
    await request(app)
      .get(`/api/viewings/${viewing.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('prevents agent from accessing another agent listing detail endpoint', async () => {
    if (shouldSkipDbTests()) return;
    const tokenAgentB = signToken(agentB);
    await request(app)
      .get(`/api/agent/listings/${listingA.id}`)
      .set('Authorization', `Bearer ${tokenAgentB}`)
      .expect(404);
  });

  it('prevents non-owner from deleting listing', async () => {
    if (shouldSkipDbTests()) return;
    const tokenAgentB = signToken(agentB);
    await request(app)
      .delete(`/api/agent/listings/${listingA.id}`)
      .set('Authorization', `Bearer ${tokenAgentB}`)
      .expect(404);
  });

  it('prevents agent from updating another agent listing', async () => {
    if (shouldSkipDbTests()) return;
    const tokenAgentB = signToken(agentB);
    await request(app)
      .patch(`/api/agent/listings/${listingA.id}`)
      .set('Authorization', `Bearer ${tokenAgentB}`)
      .send({ title: 'Hacked' })
      .expect(404);
  });

  it('prevents non-admin from resolving reports', async () => {
    if (shouldSkipDbTests()) return;
    const tokenUser = signToken(userA);
    await request(app)
      .patch(`/api/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({ action: 'resolve' })
      .expect(403);
  });

  it('prevents agent from resolving admin reports route', async () => {
    if (shouldSkipDbTests()) return;
    const tokenAgentA = signToken(agentA);
    await request(app)
      .patch(`/api/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${tokenAgentA}`)
      .send({ action: 'resolve' })
      .expect(403);
  });

  it('prevents agent from submitting another agent listing', async () => {
    if (shouldSkipDbTests()) return;
    const tokenAgentB = signToken(agentB);
    await request(app)
      .post(`/api/agent/listings/${listingA.id}/submit`)
      .set('Authorization', `Bearer ${tokenAgentB}`)
      .expect(404);
  });
});
