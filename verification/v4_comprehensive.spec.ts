import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASS = 'admin123';
const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

async function performLogin(page: any) {
  await page.goto(APP_URL);

  const isLoginVisible = await page.isVisible('text=Sign In');
  if (isLoginVisible) {
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button:has-text("Continue")');

    const error = await page.isVisible('text=Invalid email or password');
    if (error) {
      await page.click('text=Register');
      // Wait for registration view
      await page.waitForSelector('text=Create Account');
      await page.fill('input[placeholder="e.g. My Great Business"]', 'Test Org');
      // There are multiple email/password inputs in registration
      await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
      await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
      await page.locator('input[type="password"]').last().fill(ADMIN_PASS);
      await page.click('button:has-text("Create Account")');
    }
  }

  // Handle PIN
  await page.waitForSelector('#pin-input');
  await page.fill('#pin-input', ADMIN_PIN);
  await page.click('button:has-text("Enter POS")');

  // Wait for Dashboard or POS
  await expect(page.locator('button[role="menuitem"]:has-text("POS")')).toBeVisible();
}

test.describe('V4 Comprehensive Verification', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('Verify Sidebar and Navigation', async ({ page }) => {
    const navItems = [
      'POS', 'Dashboard', 'Orders', 'Products', 'Tables', 'Bookings',
      'Kitchen', 'Customers', 'Expenses', 'Ingredients', 'Suppliers',
      'PO', 'Wallet', 'Coupons', 'Alerts', 'Inventory', 'Refunds',
      'Staff', 'Schedule', 'Day End', 'Reports', 'GST', 'Logs',
      'Stores', 'Settings', 'Support'
    ];

    for (const item of navItems) {
      console.log(`Navigating to ${item}`);
      const btn = page.getByRole('menuitem', { name: item, exact: true });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(500);
      // Check if it's locked (Premium modal)
      const upgradeModal = await page.isVisible('text=Upgrade to Premium');
      if (upgradeModal) {
          console.log(`${item} is locked, closing modal`);
          await page.keyboard.press('Escape');
      }
    }
  });

  test('CRUD - Products', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("Products")');
    await page.click('button:has-text("Add Product")');
    const name = 'PerfTest Product ' + Date.now();
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="price"]', '100');
    await page.fill('input[name="stock"]', '50');
    await page.click('button:has-text("Save")');

    await expect(page.locator(`text=${name}`)).toBeVisible();

    // Edit
    await page.click(`tr:has-text("${name}") button:has(svg.lucide-edit)`);
    await page.fill('input[name="price"]', '120');
    await page.click('button:has-text("Save")');
    await expect(page.locator(`tr:has-text("${name}"):has-text("120")`)).toBeVisible();

    // Delete
    await page.click(`tr:has-text("${name}") button:has(svg.lucide-trash2)`);
    const confirmBtn = page.locator('button:has-text("Delete")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await expect(page.locator(`text=${name}`)).not.toBeVisible();
  });

  test('POS Transaction Flow', async ({ page }) => {
    await page.click('button[role="menuitem"]:has-text("POS")');

    // Add first available product
    await page.locator('button[role="gridcell"]').first().click();

    // Select Table
    await page.click('button:has-text("Select Table")');
    await page.click('button:has-text("Table 1")');

    // Checkout
    await page.click('button:has-text("Pay & Finish")');
    await expect(page.locator('text=Order Complete!')).toBeVisible();

    // Take a screenshot of the completed order
    await page.screenshot({ path: 'verification/screenshots/pos_order_complete.png' });

    await page.click('button:has-text("Close")');
  });
});
