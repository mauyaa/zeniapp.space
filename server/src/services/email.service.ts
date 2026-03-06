import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const defaultFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';

const transientCodes = new Set(['ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'EAI_AGAIN']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  options?: { retries?: number; delayMs?: number }
) {
  if (!resend) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Email] sendMail skipped — RESEND_API_KEY not configured');
    }
    return { mocked: true };
  }

  const retries = options?.retries ?? 1;
  const delayMs = options?.delayMs ?? 600;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { data, error } = await resend.emails.send({
        from: defaultFrom,
        to,
        subject,
        html,
      });
      if (error) {
        throw new Error(error.message || 'Resend API error');
      }
      return data;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const transient = code && transientCodes.has(code);
      if (transient && attempt < retries) {
        attempt += 1;
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
}

export function emailStatus() {
  const configured = Boolean(resendApiKey);
  return {
    enabled: configured,
    reason: configured ? undefined : 'RESEND_API_KEY not configured',
    from: defaultFrom,
    provider: 'resend',
  };
}

export async function verifyEmailTransport() {
  if (!resend) {
    return { ok: false, reason: 'RESEND_API_KEY not configured' };
  }
  return { ok: true, reason: 'Resend API key present' };
}

export function renderBrandEmail(params: {
  title?: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const { title, body, ctaHref, ctaLabel } = params;
  const accent = '#0b7e53';
  const text = '#0a1f1c';
  const muted = '#4a5a55';
  const logo = `ZENI<span style="color:${accent};font-size:22px;font-weight:900;">.</span>`;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8faf9;font-family:Inter,Arial,sans-serif;color:${text};">
    <table role="presentation" style="width:100%;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" style="width:640px;max-width:90%;background:#ffffff;border:1px solid #e5ede9;border-radius:12px;padding:28px;box-shadow:0 6px 24px rgba(12,85,60,0.08);">
            <tr>
              <td style="font-size:18px;font-weight:700;letter-spacing:0.08em;color:${accent};text-transform:uppercase;">${logo}</td>
            </tr>
            ${title ? `<tr><td style="padding-top:18px;font-size:22px;font-weight:700;">${title}</td></tr>` : ''}
            <tr>
              <td style="padding-top:16px;font-size:15px;line-height:1.6;color:${muted};">${body}</td>
            </tr>
            ${ctaHref && ctaLabel
      ? `<tr><td style="padding-top:22px;padding-bottom:10px;">
                     <a href="${ctaHref}" style="background:${accent};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">${ctaLabel}</a>
                   </td></tr>`
      : ''
    }
            <tr><td style="padding-top:22px;font-size:12px;color:${muted};">If you didn't expect this email, you can ignore it safely.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
