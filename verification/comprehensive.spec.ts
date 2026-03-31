import { test, expect } from '@playwright/test';

const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

test.describe('Comprehensive POS Features Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Login as Admin
    await page.fill('input[type="password"]', ADMIN_PIN);
    await page.click('button:has-text("Login")');
    await expect(page.locator('div[role="status"]').filter({ hasText: 'admin' })).toBeVisible();
  });

  test('Table Management', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Tables")');
    await expect(page.getByRole('dialog').getByText('Table Manager')).toBeVisible();

    // Add a table
    await page.click('button:has-text("Add Table")');
    await page.fill('input[value^="Table "]', 'Test Table 101');
    await page.fill('input[type="number"]', '6');
    await page.click('button:has-text("Save")');
    // The table card should have the name
    await expect(page.getByRole('dialog').locator('span:has-text("Test Table 101")')).toBeVisible();

    // Change status
    await page.click('text=Mark Occupied');
    await expect(page.getByRole('dialog').getByText('occupied')).toBeVisible();

    // Close modal
    await page.click('div[role="dialog"] button:has(svg.lucide-x)');
  });

  test('Expense Tracking', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Expenses")');
    await expect(page.locator('h1:has-text("Expense Tracking")')).toBeVisible();

    // Add expense
    await page.click('button:has-text("Add Expense")');
    // Use nth=0 or placeholder if description is first
    await page.fill('input[placeholder="0.00"]', '500');
    await page.fill('input[placeholder="Optional"]', 'Test Utility Bill');

    await page.click('button:has-text("Save Expense")');
    await expect(page.locator('text=Test Utility Bill')).toBeVisible();
  });

  test('Ingredient & Recipe Management', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Ingredients")');
    await expect(page.locator('h1:has-text("Ingredients & Recipes")')).toBeVisible();

    // Add Ingredient
    await page.click('button:has-text("Add Ingredient")');
    await page.fill('input[placeholder="Ingredient name"]', 'Test Flour');
    await page.fill('input[type="number"] >> nth=0', '10'); // Stock
    await page.fill('input[type="number"] >> nth=1', '2');  // Reorder level
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Test Flour')).toBeVisible();

    // Switch to Recipes
    await page.click('button:has-text("Recipes")');
    await page.click('button:has-text("Add Recipe Link")');
    await expect(page.locator('text=Link Product to Ingredient')).toBeVisible();
    await page.click('button:has-text("Cancel")');
  });

  test('Coupon Creation', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Coupons")');
    await expect(page.locator('h1:has-text("Discount Coupons")')).toBeVisible();

    await page.click('button:has-text("Create Coupon")');
    await page.fill('input[placeholder="e.g., SAVE20"]', 'TEST50');
    await page.fill('input[type="number"] >> nth=0', '50'); // Discount
    await page.click('button:has-text("Create Coupon") >> nth=1'); // The Save button in modal
    await expect(page.locator('text=TEST50')).toBeVisible();
  });

  test('Staff Attendance', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Staff")');
    // Use getByRole for the heading to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Staff Attendance' })).toBeVisible();

    // It should show at least the current admin as clocked in or the clock-in button
    const clockInBtn = page.getByRole('button', { name: 'Clock In' });
    const clockOutBtn = page.getByRole('button', { name: 'Clock Out' });

    if (await clockInBtn.isVisible()) {
        await clockInBtn.click();
        await expect(page.getByRole('button', { name: 'Clock Out' })).toBeVisible();
    } else {
        await expect(clockOutBtn).toBeVisible();
    }
  });

  test('Settings Update', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Settings")');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // First input is Store Name
    const storeNameInput = page.locator('input').nth(0);
    const originalName = await storeNameInput.inputValue();
    await storeNameInput.fill('Updated Test Store');
    await page.click('button:has-text("Save Settings")');

    // Refresh or check toast/persistence
    await page.reload();
    await page.waitForTimeout(2000); // Give it more time
    // Re-login after reload if necessary (but it should be persisted)
    if (await page.locator('input[type="password"]').isVisible()) {
        await page.fill('input[type="password"]', ADMIN_PIN);
        await page.click('button:has-text("Login")');
    }

    // After re-login, we need to go back to Settings
    await page.click('button[role="menuitem"]:has-text("Settings")');

    const updatedName = await page.locator('input').nth(0).inputValue();
    expect(updatedName).toBe('Updated Test Store');

    // Restore
    await page.locator('input').nth(0).fill(originalName);
    await page.click('button:has-text("Save Settings")');
  });

  test('Dashboard & Reports Visibility', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Dashboard")');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Today\'s Revenue')).toBeVisible();

    await page.click('button[role="menuitem"]:has-text("Reports")');
    await expect(page.locator('h1:has-text("Reports & Data")')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible();
  });

  test('Remaining Screens Navigation', async ({ page }) => {
    const screens = [
      { name: 'Bookings', heading: 'Reservations' },
      { name: 'Kitchen', heading: 'Kitchen Display' },
      { name: 'Alerts', heading: 'Inventory Alerts' },
      { name: 'Refunds', heading: 'Refund Requests' },
      { name: 'GST', heading: 'GST Reports' },
      { name: 'Logs', heading: 'Activity Logs' },
      { name: 'Stores', heading: 'Store Management' },
      { name: 'Training', heading: 'Training Guide' },
      { name: 'Schedule', heading: 'Staff Scheduling' },
      { name: 'Day End', heading: 'Day-End Reconciliation' },
    ];

    for (const screen of screens) {
      const btn = page.locator('button[role="menuitem"]').filter({ hasText: screen.name });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      // Use a more flexible check for heading
      await expect(page.locator(`h1, h2, span`).filter({ hasText: screen.heading }).first()).toBeVisible();
    }
  });

});
