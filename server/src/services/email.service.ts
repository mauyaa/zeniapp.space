/* eslint-disable @typescript-eslint/no-explicit-any */
let transporter: any = null;
let enabled = false;
let disabledReason = '';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  enabled = Boolean(smtpHost && smtpUser && smtpPass);
  if (enabled) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
  } else {
    disabledReason = 'SMTP credentials missing';
  }
} catch (err) {
  enabled = false;
  transporter = null;
  disabledReason = (err as Error)?.message || 'nodemailer not available';
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    // noop in dev if not configured
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Email] sendMail skipped (transporter unavailable)', disabledReason || 'not configured');
    }
    return { mocked: true };
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@zeni.test',
    to,
    subject,
    html
  });
}

export function emailStatus() {
  return {
    enabled,
    reason: enabled ? undefined : disabledReason || 'not configured',
    from: process.env.SMTP_FROM || 'no-reply@zeni.test',
    host: process.env.SMTP_HOST || undefined
  };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
