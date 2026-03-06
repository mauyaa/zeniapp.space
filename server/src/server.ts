import { createServer } from 'http';
import cron from 'node-cron';
import { app } from './app';
import { connectDB } from './config/db';
import { env, validateRuntimeEnv } from './config/env';
import { initSocket } from './socket';
import { expirePendingInvoices } from './services/pay.service';
import {
  expireStalePortalTransactions,
  detectPaidWithoutReceipt,
  registerPayGauges,
} from './services/payPortal.service';
import { recordStaleRun, recordReceiptScan } from './services/payInsights.service';
import { runGeoSanitySweep } from './services/listing.service';
import { verifyEmailTransport, sendMail, renderBrandEmail } from './services/email.service';

async function start() {
  validateRuntimeEnv();
  await connectDB();
  const httpServer = createServer(app);
  initSocket(httpServer);
  httpServer.listen(env.port, '0.0.0.0', () =>
    console.log(`API running on http://localhost:${env.port}`)
  );

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

  // Nightly geo sanity: snap mislocated listings based on area/city geocode
  cron.schedule('15 3 * * *', async () => {
    try {
      const result = await runGeoSanitySweep();
      if (result.fixed) {
        console.log(`[cron] geo sanity sweep corrected ${result.fixed}/${result.scanned} listings`);
      }
    } catch (err) {
      console.error('[cron] geo sanity sweep failed', err);
    }
  });

  // Detect integrity anomalies (paid tx without receipts)
  cron.schedule('*/15 * * * *', async () => {
    const n = await detectPaidWithoutReceipt();
    if (n) console.warn(`[cron] found ${n} paid transactions missing receipts (logged to audit)`);
    recordReceiptScan();
    registerPayGauges();
  });

  // Daily email transport health at 04:00 (gen4 automation)
  cron.schedule('0 4 * * *', async () => {
    const status = await verifyEmailTransport();
    if (!status.ok) {
      console.error('[cron] email health failed', status.reason);
      if (env.zeniAdminEmail?.includes('@')) {
        await sendMail(
          env.zeniAdminEmail,
          '[ZENI] Email delivery check failed',
          renderBrandEmail({
            title: 'Email delivery check failed',
            body: `Email transport verification failed: ${status.reason}<br/>Please check SMTP/Ethereal configuration.`,
          })
        ).catch((err) => console.error('[cron] failed to send email health alert', err));
      }
    } else if (env.nodeEnv !== 'production' && env.zeniAdminEmail?.includes('@')) {
      // In dev, send a short heartbeat so we can see previews; in prod we stay silent unless failed
      await sendMail(
        env.zeniAdminEmail,
        '[ZENI] Email delivery heartbeat',
        renderBrandEmail({
          title: 'Email transport healthy',
          body: `Email transport verified successfully (${status.reason}). No action needed.`,
        })
      ).catch((err) => console.warn('[cron] email heartbeat failed', err));
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
