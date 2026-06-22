import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Fill in the login form with seeded admin credentials
    await page.getByLabel('Email Address').fill('admin@techindustan.com');
    await page.getByLabel('Password').fill('Admin@123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect after login – allow up to 15 seconds for API + React state update
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 });
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    await page.getByLabel('Email Address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');

    await page.click('button[type="submit"]');

    // The Login page shows an MUI Alert with the error from the backend
    // Backend returns 401 with message "Invalid credentials" or similar
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 8000 });
  });
});
