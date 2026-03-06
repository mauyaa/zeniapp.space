/* Quick smoke to verify email transport and preview links in dev. Run with:
 *   npm --prefix server run ts-node -- scripts/emailSmoke.ts
 */
import { sendMail, verifyEmailTransport } from '../src/services/email.service';
import { env } from '../src/config/env';

async function main() {
  const status = await verifyEmailTransport();
  console.log('[email-smoke] transport status:', status);
  if (!status.ok) {
    console.error('[email-smoke] transport not ready, aborting');
    process.exit(1);
  }
  const to = env.zeniAdminEmail?.includes('@') ? env.zeniAdminEmail : 'developer@zeni.test';
  const info = await sendMail(
    to,
    'ZENI email smoke check',
    `<p>This is an automated smoke test from the CLI at ${new Date().toISOString()}.</p><p>If you're on Ethereal, check the logged Preview URL.</p>`
  );
  console.log('[email-smoke] send result:', (info as { id?: string })?.id || info);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
