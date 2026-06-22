import { test, expect } from '@playwright/test';

test.describe('Employee Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stale session state before each test/retry
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => localStorage.clear());

    // Re-navigate after clearing storage so the app re-initialises
    await page.goto('http://localhost:5173/login');

    await page.getByLabel('Email Address').fill('admin@techindustan.com');
    await page.getByLabel('Password').fill('Admin@123');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 });
  });

  test('should navigate to employees and open add employee modal', async ({ page }) => {
    // Navigate to employees page via sidebar
    await page.click('text=Employees');
    await expect(page).toHaveURL(/.*\/employees/, { timeout: 10000 });

    // Wait for Add Employee button and click
    const addBtn = page.locator('button:has-text("Add Employee")');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // The modal title is "Register New Employee" for the add dialog
    const modalTitle = page.locator('text=Register New Employee');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
  });
});
