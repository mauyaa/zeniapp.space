import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import { ConversationModel } from '../src/models/Conversation';
import { MessageModel } from '../src/models/Message';
import { NotificationModel } from '../src/models/Notification';

async function run() {
  await connectDB();
  const [messages, conversations, notifications] = await Promise.all([
    MessageModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    NotificationModel.deleteMany({ type: 'message' })
  ]);

  console.log(
    `Cleared chat data: ${messages.deletedCount ?? 0} messages, ${conversations.deletedCount ?? 0} conversations, ${notifications.deletedCount ?? 0} message notifications.`
  );
  await disconnectDB();
}

run().catch((err) => {
  console.error('[clear-chat] failed', err);
  disconnectDB().finally(() => process.exit(1));
});
