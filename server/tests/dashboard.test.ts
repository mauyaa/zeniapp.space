import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { app } from '../src/app';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { ConversationModel } from '../src/models/Conversation';
import { SavedListingModel } from '../src/models/SavedListing';
import { InvoiceModel } from '../src/models/Invoice';
import { PaymentTransactionModel } from '../src/models/PaymentTransaction';
import { env } from '../src/config/env';
import { shouldSkipDbTests } from './skipDb';

let userToken: string;
let agentToken: string;
let adminToken: string;
describe('dashboard', () => {
  beforeEach(async () => {
    if (shouldSkipDbTests()) return;
    const [user, agent, admin] = await Promise.all([
      UserModel.create({ name: 'DashboardUser', emailOrPhone: 'user@sample.com', password: 'secret123', role: 'user' }),
      UserModel.create({ name: 'DashboardAgent', emailOrPhone: 'agent@sample.com', password: 'secret123', role: 'agent', agentVerification: 'verified' }),
      UserModel.create({ name: 'DashboardAdmin', emailOrPhone: 'admin@sample.com', password: 'secret123', role: 'admin' })
    ]);

    userToken = sign({ sub: user.id, role: user.role }, env.jwtSecret);
    agentToken = sign({ sub: agent.id, role: agent.role }, env.jwtSecret);
    adminToken = sign({ sub: admin.id, role: admin.role }, env.jwtSecret);

    const listing = await ListingModel.create({
      title: 'Dashboard Listing',
      price: 500,
      location: { type: 'Point', coordinates: [36.8, -1.3] },
      status: 'live',
      currency: 'KES',
      purpose: 'rent',
      agentId: agent.id,
      verified: true
    });
    await SavedListingModel.create({ userId: user.id, listingId: listing.id });
    await ConversationModel.create({ listingId: listing.id, userId: user.id, agentId: agent.id });
    const invoice = await InvoiceModel.create({
      userId: user.id,
      roleScope: 'user',
      purpose: 'booking_fee',
      amount: 1000,
      status: 'unpaid',
      dueDate: new Date()
    });
    await PaymentTransactionModel.create({
      invoiceId: invoice._id,
      userId: user.id,
      method: 'mpesa_stk',
      amount: 1000,
      status: 'pending',
      provider: 'mpesa',
      idempotencyKey: 'dashboard-test'
    });
  });

  it('returns correct user metrics', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .get('/api/dashboard/user')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.saved.total).toBe(1);
    expect(response.body.conversations.total).toBe(1);
    expect(response.body.invoices.total).toBe(1);
    expect(response.body.transactions.counts.pending).toBe(1);
  });

  it('returns agent overview', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .get('/api/dashboard/agent')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(response.body.listings.total).toBe(1);
    expect(response.body.listings.live).toBe(1);
    expect(response.body.conversations.total).toBe(1);
  });

  it('returns admin dashboard data', async () => {
    if (shouldSkipDbTests()) return;
    const response = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.counts.users).toBe(3);
    expect(response.body.counts.agents).toBe(1);
    expect(response.body.counts.liveListings).toBe(1);
  });
});
