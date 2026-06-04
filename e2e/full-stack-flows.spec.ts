import { expect, test, type Page } from '@playwright/test';

const SEED_PASSWORD = 'ChangeMe123!';
const SEEDED_LIVE_LISTING_TITLE = 'Riverside Suites - Corner 3BR';
const SEEDED_USERS = {
  user: 'user-basic@zeni.test',
  agent: 'zeniagent.ke@gmail.com',
  admin: 'zeniapp.ke@gmail.com',
} as const;

test.describe('Full-stack seeded role flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('user can message a live listing and the agent can reply in the same conversation', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const userContext = await browser.newContext();
    const agentContext = await browser.newContext();

    try {
      const userPage = await userContext.newPage();
      await loginMainApp(userPage, SEEDED_USERS.user, SEED_PASSWORD);
      await openSeededLiveListing(userPage);
      await expect(userPage.getByRole('button', { name: /message agent/i })).toBeVisible();
      await userPage.getByRole('button', { name: /message agent/i }).click();
      await expect(userPage).toHaveURL(/\/app\/messages\/[^/]+$/);

      const conversationId = getConversationIdFromUrl(userPage.url());
      const outboundMessage = `E2E user ping ${Date.now()}`;
      await sendThreadMessage(userPage, outboundMessage);
      await expectThreadMessageVisible(userPage, outboundMessage);

      const agentPage = await agentContext.newPage();
      await loginSecurePortal(agentPage, '/agentlogin', SEEDED_USERS.agent, SEED_PASSWORD);
      await agentPage.goto('/agent/messages');
      const conversationButton = agentPage.locator('button').filter({ hasText: outboundMessage });
      await expect(conversationButton).toBeVisible();
      await conversationButton.click();
      await expect(agentPage).toHaveURL(new RegExp(`/agent/messages/${conversationId}$`));
      await expectThreadMessageVisible(agentPage, outboundMessage);

      const inboundReply = `E2E agent reply ${Date.now()}`;
      await sendThreadMessage(agentPage, inboundReply);
      await expectThreadMessageVisible(agentPage, inboundReply);

      await userPage.goto('/app/messages');
      const userConversationButton = userPage.getByRole('button', {
        name: /open conversation with zeni agent/i,
      });
      await expect(userConversationButton).toBeVisible();
      await userConversationButton.click();
      await expect(userPage).toHaveURL(new RegExp(`/app/messages/${conversationId}$`));
      await expectThreadMessageVisible(userPage, inboundReply);
    } finally {
      await userContext.close();
      await agentContext.close();
    }
  });

  test('admin can approve a seeded pending listing after step-up verification', async ({
    page,
  }) => {
    await loginSecurePortal(page, '/adminlogin', SEEDED_USERS.admin, SEED_PASSWORD);
    await page.goto('/admin/listings');

    const pendingRow = page.locator('tr', { hasText: 'Valley View Studio' });
    await expect(pendingRow).toBeVisible();
    await pendingRow.getByRole('button', { name: /approve valley view studio/i }).click();

    await expect(page.locator('#admin-step-up-code')).toBeVisible();
    await page.locator('#admin-step-up-code').fill('000000');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.locator('tr', { hasText: 'Valley View Studio' })).toHaveCount(0);
  });

  test('unverified pay user cannot initiate a bank-transfer payment', async ({
    page,
  }) => {
    await loginPayPortal(page, SEEDED_USERS.user, SEED_PASSWORD);
    await expect(page.getByTestId('pay-dashboard')).toBeVisible();

    await page.goto('/pay/payments');
    await expect(page.getByRole('heading', { name: /make a payment/i })).toBeVisible();

    await page.locator('input[type="number"]').fill('4321');
    await page.getByRole('button', { name: /^bank transfer/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(
      page.getByRole('status').filter({ hasText: /identity verification is required/i })
    ).toBeVisible();
    await expect(
      page.getByText(/use the reference below when making your transfer/i)
    ).toHaveCount(0);
  });
});

async function loginMainApp(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-pass').fill(password);
  await page
    .locator('form')
    .filter({ has: page.locator('#login-email') })
    .getByRole('button', { name: /secure sign in/i })
    .click();
  await expect(page).toHaveURL(/\/app\/home/);
}

async function openSeededLiveListing(page: Page) {
  await page.goto('/app/explore');
  const listingCard = page.locator('button').filter({ hasText: SEEDED_LIVE_LISTING_TITLE }).first();
  await expect(listingCard).toBeVisible();
  await listingCard.click();
  await expect(page.getByRole('dialog', { name: SEEDED_LIVE_LISTING_TITLE })).toBeVisible();
}

async function loginSecurePortal(page: Page, route: '/agentlogin' | '/adminlogin', email: string, password: string) {
  await page.goto(route);
  await page.getByPlaceholder('Email or 07xx').fill(email);
  await page.getByPlaceholder('********').fill(password);
  await page.getByRole('button', { name: /authorize entry/i }).click();
  await expect(page).toHaveURL(route === '/adminlogin' ? /\/admin\/verification/ : /\/agent\/dashboard/);
}

async function loginPayPortal(page: Page, email: string, password: string) {
  await page.goto('/pay/login');
  await page.getByPlaceholder(/client email/i).fill(email);
  await page.getByPlaceholder(/secure password/i).fill(password);
  await page.getByRole('button', { name: /authenticate.*pay/i }).click();
  await expect(page).toHaveURL(/\/pay\/dashboard/);
}

async function sendThreadMessage(page: Page, message: string) {
  const composer = page.getByPlaceholder(/type a message/i);
  await composer.fill(message);
  await page.getByRole('button', { name: /send message/i }).click();
}

async function expectThreadMessageVisible(page: Page, message: string) {
  await expect(page.getByLabel('Active conversation').getByText(message)).toBeVisible();
}

function getConversationIdFromUrl(url: string) {
  const match = url.match(/\/messages\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Conversation id not found in URL: ${url}`);
  }
  return match[1];
}
