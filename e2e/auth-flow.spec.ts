import { expect, test } from '@playwright/test';

test.describe('Auth flow shell', () => {
  test('switches between login and register routes', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /request membership/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    await page.getByRole('button', { name: /return to login/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('shows client-side validation errors on empty login submit', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /secure sign in/i }).click();

    await expect(page.getByText('Email or phone is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('password visibility toggle has accessible labels', async ({ page }) => {
    await page.goto('/login');

    const toggle = page.getByRole('button', { name: /show password/i }).first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: /hide password/i }).first()).toBeVisible();
  });
});
