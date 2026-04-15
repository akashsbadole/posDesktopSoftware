import { test, expect } from '@playwright/test';

const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

test.describe('Comprehensive POS Features Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Login as Admin - select organization and enter PIN
    await page.click('button:has-text("Default Organization")'); // Select the default organization
    await page.fill('input[type="password"]', ADMIN_PIN);
    await page.click('button:has-text("Enter POS")');
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
    // Look for the status badge text specifically. exact: true avoids matching "Mark Occupied" button.
    await expect(page.getByRole('dialog').getByText('occupied', { exact: true }).first()).toBeVisible();

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

  test('Staff Attendance & Salary', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Staff")');
    // Use getByRole for the heading to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Staff & Salary Management' })).toBeVisible();

    // Verify tabs are present
    await expect(page.locator('button:has-text("Staff Directory")')).toBeVisible();
    await expect(page.locator('button:has-text("Calculate Salary")')).toBeVisible();
    await expect(page.locator('button:has-text("Attendance")')).toBeVisible();

    // Switch to Attendance tab
    await page.click('button:has-text("Attendance")');

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
    await page.waitForTimeout(1000); // Give it more time
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

  test('Navigation of All Sidebar Menu Items', async ({ page }) => {
    const navItems = [
      { name: 'POS', heading: 'Point of Sale' },
      { name: 'Dashboard', heading: 'Dashboard' },
      { name: 'Orders', heading: 'Orders' },
      { name: 'Products', heading: 'Products' },
      { name: 'Tables', heading: 'Table Management' },
      { name: 'Bookings', heading: 'Reservations' },
      { name: 'Kitchen', heading: 'Kitchen Display' },
      { name: 'Customers', heading: 'Customer CRM' },
      { name: 'Expenses', heading: 'Expenses' },
      { name: 'Ingredients', heading: 'Ingredients & Stock' },
      { name: 'Schedule', heading: 'Staff Scheduling' },
      { name: 'Day End', heading: 'Day-End Reconciliation' },
      { name: 'Suppliers', heading: 'Suppliers' },
      { name: 'PO', heading: 'Purchase Orders' },
      { name: 'Wallet', heading: 'Customer Wallet' },
      { name: 'Coupons', heading: 'Coupons & Offers' },
      { name: 'Inventory', heading: 'Inventory Management' },
      { name: 'Alerts', heading: 'Inventory Alerts' },
      { name: 'Refunds', heading: 'Refund Requests' },
      { name: 'Staff', heading: 'Staff & Salary' },
      { name: 'Reports', heading: 'Reports' },
      { name: 'TAX', heading: 'Tax Reports' },
      { name: 'Logs', heading: 'Activity Logs' },
      { name: 'Stores', heading: 'Stores' },
      { name: 'Settings', heading: 'Settings' },
      { name: 'Support', heading: 'Support' },
    ];

    const allItems = await page.getByRole('menuitem').allInnerTexts();
    console.log('Available menu items:', allItems);

    for (const item of navItems) {
      console.log(`Navigating to ${item.name}`);
      const btn = page.getByRole('menuitem', { name: item.name, exact: true });

      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      // Use HeaderBar's screen label span which often has color #9090A8
      const headerLabel = page.locator('header span').first();
      await expect(headerLabel).toHaveText(item.heading, { ignoreCase: true });
    }
  });

});
