import { createServer, type Server } from 'http';
import cron from 'node-cron';
import { app } from './app';
import { connectDB } from './config/db';
import { env, validateRuntimeEnv } from './config/env';
import { describeAdminStepUpPolicyForLog } from './utils/stepUpPolicy';
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
import { enforcePaymentReadinessAtBoot } from './services/paymentReadiness.service';
import { expireVerificationDocuments } from './services/verificationDocument.service';

let runtimeServer: Server | null = null;

function shutdownRuntimeServer(code: number) {
  if (!runtimeServer) {
    process.exit(code);
    return;
  }

  const hardTimeout = setTimeout(() => process.exit(code), 10000);
  hardTimeout.unref?.();

  runtimeServer.close((error) => {
    if (error) {
      console.error('[fatal] HTTP server shutdown failed', error);
    }
    process.exit(code);
  });
}

function installFatalProcessHandlers() {
  process.on('unhandledRejection', (reason) => {
    console.error('[runtime] Unhandled promise rejection', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[fatal] Uncaught exception', err);
    if (env.nodeEnv === 'production') {
      shutdownRuntimeServer(1);
      return;
    }
    console.error(
      '[runtime] Keeping process alive in non-production mode to avoid forced restarts.'
    );
  });
}

type CronTask = () => Promise<void>;

function scheduleSafeCron(name: string, expression: string, task: CronTask) {
  let running = false;
  cron.schedule(expression, async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.error(`[cron] ${name} failed`, err);
    } finally {
      running = false;
    }
  });
}

async function start() {
  installFatalProcessHandlers();
  validateRuntimeEnv();
  const paymentReadiness = enforcePaymentReadinessAtBoot();
  await connectDB();
  const httpServer = createServer(app);
  runtimeServer = httpServer;
  httpServer.requestTimeout = 20000;
  httpServer.headersTimeout = 25000;
  httpServer.keepAliveTimeout = 5000;
  initSocket(httpServer);
  httpServer.on('error', (error) => {
    console.error('[server] HTTP server error', error);
  });
  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`API running on http://localhost:${env.port}`);
    console.log('[health] liveness=GET /health readiness=GET /ready contract=json-only');
    console.log(`[auth] Admin step-up: ${describeAdminStepUpPolicyForLog()}`);
    console.log(`[payments] readiness=${JSON.stringify(paymentReadiness)}`);
  });

  if (!env.enableCrons) {
    console.log('[cron] disabled (set ENABLE_CRONS=true to enable)');
    return;
  }

  // Seed gauges once at startup (cron refresh handles ongoing updates).
  registerPayGauges();

  scheduleSafeCron('expire_pending_invoices', '0 3 * * *', async () => {
    const n = await expirePendingInvoices();
    if (n) console.log(`[cron] expired overdue invoices: ${n}`);
  });

  scheduleSafeCron('expire_verification_documents', '30 3 * * *', async () => {
    const n = await expireVerificationDocuments();
    if (n) console.log(`[cron] expired verification documents: ${n}`);
  });

  scheduleSafeCron('expire_stale_portal_transactions', '*/10 * * * *', async () => {
    const n = await expireStalePortalTransactions(env.payStaleMinutes);
    if (n) console.log(`[cron] marked ${n} stale pay portal transactions as failed`);
    recordStaleRun();
    registerPayGauges();
  });

  // Nightly geo sanity: snap mislocated listings based on area/city geocode.
  scheduleSafeCron('geo_sanity_sweep', '15 3 * * *', async () => {
    const result = await runGeoSanitySweep();
    if (result.fixed) {
      console.log(`[cron] geo sanity sweep corrected ${result.fixed}/${result.scanned} listings`);
    }
  });

  // Detect integrity anomalies (paid tx without receipts).
  scheduleSafeCron('detect_paid_without_receipt', '*/15 * * * *', async () => {
    const n = await detectPaidWithoutReceipt();
    if (n) console.warn(`[cron] found ${n} paid transactions missing receipts (logged to audit)`);
    recordReceiptScan();
    registerPayGauges();
  });

  // Daily email transport health at 04:00 (gen4 automation).
  scheduleSafeCron('email_transport_health', '0 4 * * *', async () => {
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
      return;
    }

    if (env.nodeEnv !== 'production' && env.zeniAdminEmail?.includes('@')) {
      // In dev, send a short heartbeat so we can see previews; in prod we stay silent unless failed.
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
