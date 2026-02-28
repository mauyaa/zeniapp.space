import { createServer } from 'http';
import cron from 'node-cron';
import { app } from './app';
import { connectDB } from './config/db';
import { env, validateRuntimeEnv } from './config/env';
import { initSocket } from './socket';
import { expirePendingInvoices } from './services/pay.service';
import { expireStalePortalTransactions, detectPaidWithoutReceipt, registerPayGauges } from './services/payPortal.service';
import { recordStaleRun, recordReceiptScan } from './services/payInsights.service';

async function start() {
  validateRuntimeEnv();
  await connectDB();
  const httpServer = createServer(app);
  initSocket(httpServer);
  httpServer.listen(env.port, '0.0.0.0', () => console.log(`API running on http://localhost:${env.port}`));

  cron.schedule('0 3 * * *', async () => {
    const n = await expirePendingInvoices();
    if (n) console.log(`[cron] expired overdue invoices: ${n}`);
  });

  cron.schedule('*/10 * * * *', async () => {
    const n = await expireStalePortalTransactions(env.payStaleMinutes);
    if (n) console.log(`[cron] marked ${n} stale pay portal transactions as failed`);
    recordStaleRun();
    registerPayGauges();
  });

  // Detect integrity anomalies (paid tx without receipts)
  cron.schedule('*/15 * * * *', async () => {
    const n = await detectPaidWithoutReceipt();
    if (n) console.warn(`[cron] found ${n} paid transactions missing receipts (logged to audit)`);
    recordReceiptScan();
    registerPayGauges();
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
