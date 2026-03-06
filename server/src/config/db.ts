import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const isTest = process.env.NODE_ENV === 'test';

export async function connectDB(retries = MAX_RETRIES): Promise<void> {
  try {
    mongoose.connection.on('error', (err) => {
      if (!isTest) console.error('[DB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      if (!isTest) console.warn('[DB] Disconnected from MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      if (!isTest) console.log('[DB] Reconnected to MongoDB');
    });

    const isProd = env.nodeEnv === 'production';
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: isProd ? 20 : 10,
      minPoolSize: isProd ? 5 : 2,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      autoIndex: !isProd,
    });

    if (!isTest)
      console.log(
        '[DB] Connected successfully to',
        env.mongoUri.replace(/\/\/.*@/, '//<credentials>@')
      );
  } catch (error) {
    const err = error as Error;
    if (!isTest) console.error(`[DB] Connection failed: ${err.message}`);

    if (retries > 0) {
      if (!isTest)
        console.log(
          `[DB] Retrying connection in ${RETRY_DELAY_MS / 1000}s... (${retries} attempts left)`
        );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }

    if (!isTest) console.error('[DB] Max retries exceeded. Exiting...');
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (!isTest) console.log('[DB] Disconnected gracefully');
  } catch (error) {
    if (!isTest) console.error('[DB] Error during disconnect:', (error as Error).message);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});
