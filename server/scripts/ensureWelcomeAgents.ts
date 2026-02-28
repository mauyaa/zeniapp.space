/**
 * Creates Zeni Support and Zeni Agent users if they don't exist.
 * Run this if Messages shows "No chats yet" and you haven't run the full seed:
 *   npx ts-node server/scripts/ensureWelcomeAgents.ts
 * (or npm run ensure-welcome-agents if you add the script)
 */
import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';

const defaultPassword = process.env.SEED_PASSWORD || 'ChangeMe123!';

async function ensureUser(email: string, name: string) {
  const existing = await UserModel.findOne({ emailOrPhone: email });
  if (existing) {
    console.log(`  ${name} already exists (${email}).`);
    return existing;
  }
  const user = await UserModel.create({
    name,
    emailOrPhone: email,
    email,
    password: defaultPassword,
    role: 'agent',
    status: 'active',
    agentVerification: 'verified'
  });
  console.log(`  Created ${name} (${email}).`);
  return user;
}

async function run() {
  await connectDB();
  console.log('Ensuring Zeni Support, Zeni Agent, and Zeni Admin users...');
  const supportEmail = process.env.ZENI_SUPPORT_EMAIL || 'support@zeni.test';
  const agentEmail = process.env.ZENI_AGENT_EMAIL || process.env.AGENT_EMAIL || 'agent@zeni.test';
  const adminEmail = process.env.ZENI_ADMIN_EMAIL || 'admin@zeni.test';
  await ensureUser(supportEmail, 'Zeni Support');
  await ensureUser(agentEmail, 'Zeni Agent');
  await ensureUser(adminEmail, 'Zeni Admin');
  console.log('Done. Restart the server and open Messages; Zeni Agent, Zeni Support, and Zeni Admin should appear.');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  disconnectDB().finally(() => process.exit(1));
});
