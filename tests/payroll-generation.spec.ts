import { test, expect } from '@playwright/test';

test.describe('Payroll Generation Flow', () => {
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

  test('should navigate to payroll and click generate', async ({ page }) => {
    // Navigate to payroll via sidebar - label is "Payroll Calculation" in the UI
    await page.click('text=Payroll Calculation');
    await expect(page).toHaveURL(/.*\/payroll/, { timeout: 10000 });

    // Ensure the Generate or Regenerate Payroll button is visible
    const generateBtn = page.locator(
      'button:has-text("Generate Payroll"), button:has-text("Regenerate Payroll")'
    ).first();
    await expect(generateBtn).toBeVisible({ timeout: 15000 });

    // Click to trigger payroll generation
    await generateBtn.click();

    // The custom Toast renders plain Typography text, not MUI Alert.
    // Success message: "Payroll generated (DRAFT)!"
    // Also handle already-generated state which shows a different message.
    // Wait for either the success toast text OR the button to become "Regenerate Payroll"
    await expect(
      page.locator('text=Payroll generated').or(
        page.locator('button:has-text("Regenerate Payroll")')
      ).first()
    ).toBeVisible({ timeout: 20000 });
  });
});
