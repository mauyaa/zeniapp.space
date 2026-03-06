import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = Number(process.env.PLAYWRIGHT_PORT || (isCI ? '4173' : '5173'));
const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;

/**
 * E2E tests for Zeni.
 * Local: starts Vite dev server automatically.
 * CI: starts Vite preview against a production build.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: isCI
      ? `npm run preview -- --host ${host} --port ${port}`
      : `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 120_000 : 60_000,
  },
});
