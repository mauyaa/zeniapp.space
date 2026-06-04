import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = Number(process.env.PLAYWRIGHT_PORT || '4173');
const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT || '4100');
const apiHost = process.env.PLAYWRIGHT_API_HOST || '127.0.0.1';
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL || `http://${apiHost}:${apiPort}`;
const mongoUri = process.env.PLAYWRIGHT_MONGO_URI || 'mongodb://127.0.0.1:27017/zeni_e2e';
const sharedBackendEnv = {
  PORT: String(apiPort),
  MONGO_URI: mongoUri,
  JWT_SECRET: process.env.PLAYWRIGHT_JWT_SECRET || 'playwright-e2e-jwt-secret-1234567890',
  CORS_ORIGIN: baseURL,
  NODE_ENV: 'e2e',
  ENABLE_CRONS: 'false',
  TRUST_PROXY: 'false',
  ADMIN_DOMAIN: 'zeni.test',
  ADMIN_REQUIRE_TAILNET: 'false',
  PAY_ADMIN_REQUIRE_TAILNET: 'false',
  ADMIN_STEP_UP_CODE: '000000',
  PAY_STEP_UP_CODE: '000000',
  ADMIN_IP_ALLOWLIST: '127.0.0.1,::1',
  PAY_TX_MAX_PER_HOUR: '20',
  PAY_TX_MAX_AMOUNT_DAY: '500000',
  PAY_DUAL_CONTROL_AMOUNT: '50000',
  REQUEST_LOG_IN_TEST: 'false',
  LOG_IN_TEST: 'false',
  CHAT_DEBUG_IN_TEST: 'false',
  SEED_PASSWORD: 'ChangeMe123!',
};

/**
 * E2E tests for Zeni.
 * Spins up:
 * 1. a seeded backend against an isolated local Mongo database
 * 2. a frontend dev server proxied to that backend
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
  webServer: [
    {
      command: 'npm run e2e:backend',
      url: `${apiBaseURL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ...sharedBackendEnv,
      },
    },
    {
      command: `npm run dev -- --host ${host} --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: '/api',
        VITE_DEV_API_TARGET: apiBaseURL,
      },
    },
  ],
});
