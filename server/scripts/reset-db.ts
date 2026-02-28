import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';
import { ConversationModel } from '../src/models/Conversation';
import { MessageModel } from '../src/models/Message';
import { PayTransactionModel } from '../src/models/PayTransaction';
import { PayReceiptModel } from '../src/models/PayReceipt';
import { AuthSessionModel } from '../src/models/AuthSession';
import { PaySessionModel } from '../src/models/PaySession';
import { AuditLogModel } from '../src/models/AuditLog';

async function run() {
  await connectDB();
  await Promise.all([
    UserModel.deleteMany({}),
    ListingModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    MessageModel.deleteMany({}),
    PayTransactionModel.deleteMany({}),
    PayReceiptModel.deleteMany({}),
    AuthSessionModel.deleteMany({}),
    PaySessionModel.deleteMany({}),
    AuditLogModel.deleteMany({})
  ]);
  console.log('Database reset complete (users, listings, conversations, pay, sessions, audit).');
  await disconnectDB();
}

run().catch((err) => {
  console.error('[reset-db] failed', err);
  disconnectDB().finally(() => process.exit(1));
});
