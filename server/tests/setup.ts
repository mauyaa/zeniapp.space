/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db';

const globalAny = globalThis as any;
globalAny.__SKIP_DB_TESTS__ = false;
const originalMongoUri = process.env.MONGO_URI;

function setSkipDbTests(reason: string, error?: unknown) {
  globalAny.__SKIP_DB_TESTS__ = true;
  process.env.SKIP_DB_TESTS = '1';
  const message = `[tests/setup] Skipping DB tests: ${reason}`;
  console.warn(message, error instanceof Error ? error.message : '');
}

beforeAll(async () => {
  jest.setTimeout(60000);
  const testMongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/zeni_test';
  process.env.MONGO_URI = testMongoUri;

  try {
    await connectDB();
  } catch (error) {
    setSkipDbTests('Local MongoDB not available', error);
    return;
  }
});

afterAll(async () => {
  await disconnectDB();
  if (originalMongoUri) process.env.MONGO_URI = originalMongoUri;
});

beforeEach(async () => {
  if (globalAny.__SKIP_DB_TESTS__) return;
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not initialized');
  }
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
