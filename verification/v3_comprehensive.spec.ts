import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASS = 'admin123';
const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

async function performLogin(page) {
  await page.goto(APP_URL);

  // Check if we need to register or if we can login
  const isLoginVisible = await page.isVisible('text=Sign In');
  if (isLoginVisible) {
    // Check if we can login with default creds
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button:has-text("Continue")');

    // If it fails, we might need to register
    const error = await page.isVisible('text=Invalid email or password');
    if (error) {
      await page.click('text=Register');
      await page.fill('input[placeholder="My Business Name"]', 'Test Org');
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASS);
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

test.describe('V3 Comprehensive Verification', () => {
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
      const btn = page.getByRole('menuitem', { name: item, exact: true });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      // Verify something on the screen to ensure it loaded
      // Most screens have a heading or unique text
      await page.waitForTimeout(200);
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
    // Assuming there's a confirmation
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
    await page.click('button:has-text("Close")');
  });
});
