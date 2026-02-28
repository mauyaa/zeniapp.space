/**
 * Run saved search alerts once. Use from cron (see below for every-6h example).
 * Usage: npx ts-node -r dotenv/config scripts/run-saved-search-alerts.ts
 * Cron example: 0 0,6,12,18 * * * (every 6 hours)
 */
import mongoose from 'mongoose';
import { runSavedSearchAlerts } from '../src/jobs/savedSearchAlerts';
import { env } from '../src/config/env';

async function main() {
  await mongoose.connect(env.mongoUri);
  const result = await runSavedSearchAlerts();
  console.log('[saved-search-alerts]', result);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
