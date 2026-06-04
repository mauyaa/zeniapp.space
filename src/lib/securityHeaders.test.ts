import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type VercelHeader = { key: string; value: string };
type VercelConfig = {
  headers?: Array<{ source: string; headers: VercelHeader[] }>;
  rewrites?: Array<{ source: string; destination: string }>;
};

function productionConfig() {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')) as VercelConfig;
}

function productionHeaders() {
  const config = productionConfig();
  const rule = config.headers?.find((entry) => entry.source === '/(.*)');
  return Object.fromEntries((rule?.headers || []).map((header) => [header.key, header.value]));
}

describe('frontend production security headers', () => {
  it('provides the required browser security headers', () => {
    const headers = productionHeaders();
    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain('report-uri /csp-report');
    expect(productionConfig().rewrites).toContainEqual({
      source: '/csp-report',
      destination: 'https://zeniapp-space.onrender.com/csp-report',
    });
  });

  it('limits production connect sources to explicit secure origins', () => {
    const csp = productionHeaders()['Content-Security-Policy'];
    const connectSrc = csp
      .split(';')
      .find((directive) => directive.trim().startsWith('connect-src'));
    expect(connectSrc).toContain('https://zeniapp-space.onrender.com');
    expect(connectSrc).toContain('wss://zeniapp-space.onrender.com');
    expect(connectSrc).not.toMatch(/(?:^|\s)\*(?:\s|$)/);
    expect(connectSrc).not.toMatch(/(?:^|\s)https:(?:\s|$)/);
    expect(connectSrc).not.toMatch(/(?:^|\s)http:/);
  });
});
