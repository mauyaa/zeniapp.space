import mongoose from 'mongoose';
import { env } from '../src/config/env';

async function run() {
  await mongoose.connect(env.mongoUri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No DB connection');
  }
  const result = await db.collection('users').dropIndex('email_1').catch((e) => e);
  console.log('drop index email_1:', result);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
