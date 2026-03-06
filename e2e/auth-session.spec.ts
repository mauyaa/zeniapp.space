import { expect, test, type Page } from '@playwright/test';

const b64Url = (value: string) => Buffer.from(value).toString('base64url');

const createToken = (expiresInSeconds = 60 * 60) => {
  const header = b64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = b64Url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds, sub: 'e2e-user-1' })
  );
  return `${header}.${payload}.`;
};

async function mockLogin(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: createToken(),
        refreshToken: 'e2e-refresh-token',
        user: {
          id: 'e2e-user-1',
          name: 'E2E User',
          role: 'user',
        },
      }),
    });
  });
}

test.describe('Auth session storage', () => {
  test('stores auth in localStorage when remember me is enabled', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/login');

    const rememberMe = page.getByRole('checkbox', { name: /keep me logged in/i });
    await expect(rememberMe).toBeChecked();

    await page.locator('#login-email').fill('e2e-user@example.com');
    await page.locator('#login-pass').fill('Secret123!');
    await page.getByRole('button', { name: /secure sign in/i }).click();

    await expect(page).toHaveURL(/\/app\/home/);

    const storage = await page.evaluate(() => ({
      localToken: localStorage.getItem('token'),
      sessionToken: sessionStorage.getItem('token'),
      localUser: localStorage.getItem('auth_user'),
      sessionUser: sessionStorage.getItem('auth_user'),
    }));

    expect(storage.localToken).toBeTruthy();
    expect(storage.localUser).toContain('e2e-user-1');
    expect(storage.sessionToken).toBeNull();
    expect(storage.sessionUser).toBeNull();
  });

  test('stores auth in sessionStorage when remember me is disabled', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/login');

    const rememberMe = page.getByRole('checkbox', { name: /keep me logged in/i });
    await rememberMe.uncheck();
    await expect(rememberMe).not.toBeChecked();

    await page.locator('#login-email').fill('e2e-user@example.com');
    await page.locator('#login-pass').fill('Secret123!');
    await page.getByRole('button', { name: /secure sign in/i }).click();

    await expect(page).toHaveURL(/\/app\/home/);

    const storage = await page.evaluate(() => ({
      localToken: localStorage.getItem('token'),
      sessionToken: sessionStorage.getItem('token'),
      localUser: localStorage.getItem('auth_user'),
      sessionUser: sessionStorage.getItem('auth_user'),
    }));

    expect(storage.localToken).toBeNull();
    expect(storage.localUser).toBeNull();
    expect(storage.sessionToken).toBeTruthy();
    expect(storage.sessionUser).toContain('e2e-user-1');
  });
});
