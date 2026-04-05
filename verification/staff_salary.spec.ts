import { test, expect } from '@playwright/test';

const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

test.describe('Staff Salary Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto(APP_URL);

    // Check if we need to login
    await page.fill('input[type="password"]', ADMIN_PIN);
    await page.click('button:has-text("Login")');

    // Wait for the POS screen to load
    await expect(page.locator('text=Point of Sale')).toBeVisible();
  });

  test('should manage staff hourly rates and calculate salary', async ({ page }) => {
    // Navigate to Staff section
    await page.click('button[role="menuitem"]:has-text("Staff")');
    await expect(page.locator('h1:has-text("Staff & Salary Management")')).toBeVisible();

    // 1. Add a new staff member with hourly rate
    await page.click('button:has-text("Add Staff")');
    await page.fill('input[placeholder="e.g. John Doe"]', 'Test Staff Salary');
    await page.selectOption('select', { label: 'Waiter' });
    await page.fill('input[type="number"]', '50');
    await page.click('button:has-text("Save Staff")');

    // Verify staff added
    await expect(page.locator('text=Test Staff Salary')).toBeVisible();
    await expect(page.locator('text=$50.00')).toBeVisible();

    // 2. Go to Calculate Salary tab
    await page.click('button:has-text("Calculate Salary")');
    await expect(page.locator('text=Select Pay Period')).toBeVisible();

    // Click calculate (even if 0 hours, we want to see the UI state)
    await page.click('button:has-text("Calculate Payouts")');

    // 3. Check Payment History tab
    await page.click('button:has-text("Payment History")');
    await expect(page.locator('text=No salary payment records found')).toBeVisible();

    // 4. Check Attendance tab
    await page.click('button:has-text("Attendance")');
    // Use more specific locator for Attendance heading to avoid strict mode violation
    await expect(page.locator('#attendance-title')).toBeVisible();
  });
});
