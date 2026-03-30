import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('landing-page')).toBeVisible();
});

test('auth page loads', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByTestId('auth-page')).toBeVisible();
});

