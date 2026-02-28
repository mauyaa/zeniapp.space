import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { ConversationModel } from '../src/models/Conversation';
import { MessageModel } from '../src/models/Message';
import { PayTransactionModel } from '../src/models/PayTransaction';
import { PayReceiptModel } from '../src/models/PayReceipt';

const defaultPassword = process.env.SEED_PASSWORD || 'ChangeMe123!';

async function upsertUser(seed: {
  email: string;
  name: string;
  role: 'user' | 'agent' | 'admin' | 'finance';
  status?: 'active' | 'suspended' | 'banned';
  agentVerification?: 'unverified' | 'pending' | 'verified' | 'rejected';
}) {
  const existing = await UserModel.findOne({ emailOrPhone: seed.email });
  if (existing) {
    existing.name = seed.name;
    existing.role = seed.role;
    existing.status = seed.status || 'active';
    if (seed.role === 'agent') {
      existing.agentVerification = seed.agentVerification || 'pending';
    }
    await existing.save();
    return existing;
  }
  return UserModel.create({
    name: seed.name,
    email: seed.email,
    emailOrPhone: seed.email,
    password: defaultPassword,
    role: seed.role,
    status: seed.status || 'active',
    agentVerification: seed.agentVerification || (seed.role === 'agent' ? 'pending' : 'verified')
  });
}

async function seedUsers() {
  const admin = await upsertUser({
    email: process.env.ADMIN_EMAIL || 'zeniapp.ke@gmail.com',
    name: process.env.ADMIN_NAME || 'Zeni Admin',
    role: 'admin',
    status: 'active',
    agentVerification: 'verified'
  });
  const financeInitiator = await upsertUser({
    email: 'pay-init@zeni.test',
    name: 'Pay Initiator',
    role: 'finance',
    status: 'active'
  });
  const financeApprover = await upsertUser({
    email: 'pay-approver@zeni.test',
    name: 'Pay Approver',
    role: 'finance',
    status: 'active'
  });
  const zeniSupport = await upsertUser({
    email: process.env.ZENI_SUPPORT_EMAIL || 'support@zeni.test',
    name: 'Zeni Support',
    role: 'agent',
    status: 'active',
    agentVerification: 'verified'
  });
  const verifiedAgent = await upsertUser({
    email: process.env.AGENT_EMAIL || process.env.ZENI_AGENT_EMAIL || 'zeniagent.ke@gmail.com',
    name: process.env.AGENT_NAME || 'Zeni Agent',
    role: 'agent',
    status: 'active',
    agentVerification: 'verified'
  });
  const zeniAdminAgent = await upsertUser({
    email: process.env.ZENI_ADMIN_EMAIL || 'admin@zeni.test',
    name: 'Zeni Admin',
    role: 'agent',
    status: 'active',
    agentVerification: 'verified'
  });
  const pendingAgent = await upsertUser({
    email: 'agent-pending@zeni.test',
    name: 'Pending Agent',
    role: 'agent',
    status: 'active',
    agentVerification: 'pending'
  });
  const userBasic = await upsertUser({
    email: 'user-basic@zeni.test',
    name: 'Basic User',
    role: 'user',
    status: 'active'
  });
  const userSuspended = await upsertUser({
    email: 'user-suspended@zeni.test',
    name: 'Suspended User',
    role: 'user',
    status: 'suspended'
  });
  return { admin, financeInitiator, financeApprover, zeniSupport, verifiedAgent, zeniAdminAgent, pendingAgent, userBasic, userSuspended };
}

async function ensureListings(agentId: mongoose.Types.ObjectId, pendingAgentId: mongoose.Types.ObjectId) {
  let live = await ListingModel.findOne({ agentId, status: 'live' });
  if (!live) {
    live = await ListingModel.create({
      title: 'Riverside Suites - Corner 3BR',
      description: 'Light-filled 3 bedroom with wrap-around balcony, study nook, and skyline views.',
      price: 25500000,
      currency: 'KES',
      purpose: 'buy',
      beds: 3,
      baths: 3,
      type: 'Apartment',
      amenities: ['Concierge', 'Pool', 'Gym', 'Backup power', 'Fiber-ready'],
      status: 'live',
      agentId,
      location: {
        type: 'Point',
        coordinates: [36.798348, -1.268786],
        address: 'Riverside Drive, Kenya',
        city: 'Kenya',
        area: 'Riverside'
      },
      images: [
        { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', isPrimary: true }
      ],
      verified: true,
      floorPlans: [
        {
          label: 'Typical floor plate',
          url: 'https://example.com/floorplans/riverside-3br.pdf',
          sizeBytes: 320000
        }
      ],
      catalogueUrl: 'https://example.com/catalogues/riverside-suites.pdf'
    });
  }

  let pending = await ListingModel.findOne({ agentId: pendingAgentId, status: 'pending_review' });
  if (!pending) {
    pending = await ListingModel.create({
      title: 'Valley View Studio',
      description: 'Compact studio awaiting verification.',
      price: 35000,
      currency: 'KES',
      purpose: 'rent',
      beds: 0,
      baths: 1,
      type: 'Studio',
      amenities: ['Elevator', '24/7 Security'],
      status: 'pending_review',
      agentId: pendingAgentId,
      location: {
        type: 'Point',
        coordinates: [36.8219, -1.2921],
        address: 'Valley Road, Kenya',
        city: 'Kenya',
        area: 'Upper Hill'
      },
      images: [
        { url: 'https://images.unsplash.com/photo-1505692069463-5e3405e3e7ee?auto=format&fit=crop&w=1200&q=80', isPrimary: true }
      ]
    });
  }
  return { live, pending };
}

async function seedMessaging(userId: mongoose.Types.ObjectId, agentId: mongoose.Types.ObjectId, listingId: mongoose.Types.ObjectId) {
  const existing = await ConversationModel.findOne({ userId, agentId, listingId });
  if (existing) return existing;
  const convo = await ConversationModel.create({
    userId,
    agentId,
    listingId,
    status: 'active',
    leadStage: 'new'
  });
  await MessageModel.create({
    conversationId: convo.id,
    senderId: userId,
    body: 'Hi, I am interested in this listing.',
    status: 'sent',
    senderType: 'user',
    type: 'text',
    content: { text: 'Hi, I am interested in this listing.' }
  });
  await MessageModel.create({
    conversationId: convo.id,
    senderId: agentId,
    body: 'Thanks for reaching out! When can we schedule a viewing?',
    status: 'sent',
    senderType: 'agent',
    type: 'text',
    content: { text: 'Thanks for reaching out! When can we schedule a viewing?' }
  });
  return convo;
}

async function run() {
  await connectDB();
  const { admin, financeInitiator, financeApprover, zeniSupport, verifiedAgent, pendingAgent, userBasic, userSuspended } = await seedUsers();
  const { live } = await ensureListings(verifiedAgent._id, pendingAgent._id);
  await seedMessaging(userBasic._id, verifiedAgent._id, live._id);
  await PayTransactionModel.deleteMany({});
  await PayReceiptModel.deleteMany({});
  console.log(
    [
      'Seed complete:',
      `- Admin: ${admin.emailOrPhone}`,
      `- Finance Initiator: ${financeInitiator.emailOrPhone}`,
      `- Finance Approver: ${financeApprover.emailOrPhone}`,
      `- Zeni Support: ${zeniSupport.emailOrPhone}`,
      `- Zeni Agent (verified): ${verifiedAgent.emailOrPhone}`,
      `- Agent (pending): ${pendingAgent.emailOrPhone}`,
      `- User basic: ${userBasic.emailOrPhone}`,
      `- User suspended: ${userSuspended.emailOrPhone}`,
      `- Password (all seeded users): ${defaultPassword}`,
      'Listings (properties) and sample conversation created. Support/agent welcome chats use no listing.',
      'Pay collections reset.'
    ].join('\n')
  );
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed', err);
  disconnectDB().finally(() => process.exit(1));
});
