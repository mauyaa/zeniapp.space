import { expect, test, type Page } from '@playwright/test';

const b64Url = (value: string) => Buffer.from(value).toString('base64url');

const createToken = (expiresInSeconds = 60 * 60) => {
  const header = b64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = b64Url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds, sub: 'e2e-user-1' })
  );
  return `${header}.${payload}.`;
};

async function seedAuthSession(page: Page, expiresInSeconds: number) {
  const token = createToken(expiresInSeconds);
  const user = {
    id: 'e2e-user-1',
    name: 'E2E User',
    role: 'user',
  };

  await page.goto('/login');
  await page.evaluate(
    ({ seedToken, seedUser }) => {
      localStorage.setItem('token', seedToken);
      localStorage.setItem('auth_user', JSON.stringify(seedUser));
      localStorage.setItem('refresh_token', 'e2e-refresh-token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('refresh_token');
    },
    { seedToken: token, seedUser: user }
  );
}

test.describe('Auth lifecycle', () => {
  test('expired token redirects to login and clears stale storage', async ({ page }) => {
    await seedAuthSession(page, -60);
    await page.goto('/app/home');

    await expect(page).toHaveURL(/\/login$/);

    const storage = await page.evaluate(() => ({
      localToken: localStorage.getItem('token'),
      localUser: localStorage.getItem('auth_user'),
      localRefresh: localStorage.getItem('refresh_token'),
      sessionToken: sessionStorage.getItem('token'),
    }));

    expect(storage.localToken).toBeNull();
    expect(storage.localUser).toBeNull();
    expect(storage.localRefresh).toBeNull();
    expect(storage.sessionToken).toBeNull();
  });

  test('logout clears auth storage and returns to login', async ({ page }) => {
    await seedAuthSession(page, 60 * 60);
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/app\/home/);

    const sidebarLogout = page.locator('aside').getByRole('button', { name: /log out/i });
    await expect(sidebarLogout).toBeVisible();
    await sidebarLogout.click();
    await expect(page).toHaveURL(/\/login$/);

    const storage = await page.evaluate(() => ({
      localToken: localStorage.getItem('token'),
      localUser: localStorage.getItem('auth_user'),
      localRefresh: localStorage.getItem('refresh_token'),
      sessionToken: sessionStorage.getItem('token'),
      sessionUser: sessionStorage.getItem('auth_user'),
    }));

    expect(storage.localToken).toBeNull();
    expect(storage.localUser).toBeNull();
    expect(storage.localRefresh).toBeNull();
    expect(storage.sessionToken).toBeNull();
    expect(storage.sessionUser).toBeNull();
  });
});
