import { test, expect } from '@playwright/test';

test.describe('Zeni smoke', () => {
  test('landing page loads and shows app entry', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Zeni|Real Estate|Property/i);
    await expect(page.getByText(/Zeni|Explore|Find.*property/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('login page is reachable and has form', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('textbox', { name: /email|phone|identifier/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /sign in|log in|login/i }).first()).toBeVisible();
  });

  test('explore (app) is reachable when unauthenticated', async ({ page }) => {
    await page.goto('/app/explore');
    await expect(page).toHaveURL(/\/app\/explore/, { timeout: 10_000 });
    await expect(page.getByText(/explore|properties|find/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
