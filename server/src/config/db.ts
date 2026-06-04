import mongoose from 'mongoose';
import { env } from './env';

const DEFAULT_MAX_RETRIES_PROD = 15;
const DEFAULT_MAX_RETRIES_DEV = 120; // ~6min with default delay; avoids manual restarts while Docker Mongo boots
const DEFAULT_RETRY_DELAY_MS = 3000;
const isTest = process.env.NODE_ENV === 'test';

let connectionListenersAttached = false;
let connectInFlight: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;

mongoose.set('bufferCommands', false);

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect(reason: string) {
  if (isTest || shuttingDown || reconnectTimer) return;
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

  const retryDelayMs = getRetryDelayMs();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (shuttingDown || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      return;
    }
    void connectDB(0).catch((error) => {
      if (!isTest) {
        console.error(
          `[DB] Background reconnect failed after ${reason}:`,
          (error as Error).message
        );
      }
      scheduleReconnect('retry_failure');
    });
  }, retryDelayMs);
  reconnectTimer.unref?.();
}

function attachConnectionListenersOnce() {
  if (connectionListenersAttached) return;
  connectionListenersAttached = true;

  mongoose.connection.on('error', (err) => {
    if (!isTest) console.error('[DB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    if (!isTest) console.warn('[DB] Disconnected from MongoDB');
    scheduleReconnect('disconnect');
  });

  mongoose.connection.on('reconnected', () => {
    clearReconnectTimer();
    if (!isTest) console.log('[DB] Reconnected to MongoDB');
  });
}

function parseMaxRetries(v?: string): number | undefined {
  if (!v) return undefined;
  const normalized = v.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['infinite', 'inf', 'unlimited'].includes(normalized)) return Infinity;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0) return Infinity;
  return Math.max(0, Math.floor(n));
}

function getMaxRetriesDefault(): number {
  // In tests we want to fail fast so suites can skip DB-dependent tests.
  if (isTest) return 0;
  const fromEnv = parseMaxRetries(process.env.DB_CONNECT_MAX_RETRIES);
  if (fromEnv !== undefined) return fromEnv;
  return env.nodeEnv === 'production' ? DEFAULT_MAX_RETRIES_PROD : DEFAULT_MAX_RETRIES_DEV;
}

function getRetryDelayMs(): number {
  const fromEnv = Number(process.env.DB_CONNECT_RETRY_DELAY_MS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return Math.floor(fromEnv);
  return DEFAULT_RETRY_DELAY_MS;
}

function redactMongoUri(uri: string) {
  return uri.replace(/\/\/.*@/, '//<credentials>@');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDB(retries?: number): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (connectInFlight) return connectInFlight;

  shuttingDown = false;
  attachConnectionListenersOnce();

  connectInFlight = (async () => {
    const maxRetries = typeof retries === 'number' ? Math.max(0, retries) : getMaxRetriesDefault();
    const retryDelayMs = getRetryDelayMs();
    const isProd = env.nodeEnv === 'production';

    // Semantics: maxRetries is the number of retries after the initial attempt (same as legacy behavior).
    for (let attempt = 0; ; attempt++) {
      try {
        await mongoose.connect(env.mongoUri, {
          serverSelectionTimeoutMS: isProd ? 30000 : 5000,
          socketTimeoutMS: 45000,
          maxPoolSize: isProd ? 20 : 10,
          minPoolSize: isProd ? 5 : 2,
          maxIdleTimeMS: 30000,
          heartbeatFrequencyMS: 10000,
          autoIndex: !isProd,
          bufferCommands: false,
        });

        clearReconnectTimer();
        if (!isTest) console.log('[DB] Connected successfully to', redactMongoUri(env.mongoUri));
        return;
      } catch (error) {
        const err = error as Error;
        if (!isTest) console.error(`[DB] Connection failed: ${err.message}`);

        if (attempt >= maxRetries) {
          if (!isTest) {
            console.error('[DB] Max retries exceeded.');
            if (
              err.name === 'MongooseServerSelectionError' ||
              err.message.includes('selection timed out')
            ) {
              console.error('\n' + '='.repeat(80));
              console.error('CRITICAL: MongoDB Atlas connection failed.');
              console.error(
                'This is usually because Render\'s IP addresses are not whitelisted in MongoDB Atlas.'
              );
              console.error(
                'Solution: Go to MongoDB Atlas > Network Access and allow access from 0.0.0.0/0'
              );
              console.error('='.repeat(80) + '\n');
            }
          }
          throw err;
        }

        if (!isTest) {
          const attemptsLeft = maxRetries === Infinity ? 'unlimited' : String(maxRetries - attempt);
          console.log(
            `[DB] Retrying connection in ${Math.round(retryDelayMs / 100) / 10}s... (${attemptsLeft} attempts left)`
          );
        }
        await sleep(retryDelayMs);
      }
    }
  })();

  try {
    await connectInFlight;
  } finally {
    connectInFlight = null;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    shuttingDown = true;
    clearReconnectTimer();
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
