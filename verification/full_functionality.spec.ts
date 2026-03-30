import { test, expect } from '@playwright/test';

const ADMIN_PIN = '1234';
const CASHIER_PIN = '0000';
const APP_URL = 'http://localhost:3000';

test.describe('POS System Full Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('Authentication and Lockout Logic', async ({ page }) => {
    // Test Invalid Login
    await page.fill('input[type="password"]', '9999');
    await page.click('button:has-text("Login")');
    await expect(page.locator('text=Invalid PIN. 2 attempts remaining.')).toBeVisible();

    await page.fill('input[type="password"]', '9998');
    await page.click('button:has-text("Login")');
    await expect(page.locator('text=Invalid PIN. 1 attempts remaining.')).toBeVisible();

    await page.fill('input[type="password"]', '9997');
    await page.click('button:has-text("Login")');
    await expect(page.locator('text=Too many failed attempts')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeDisabled();
  });

  test('Admin Full Workflow: Products, CRM, POS, Orders', async ({ page }) => {
    test.setTimeout(60000);
    // Login as Admin
    await page.fill('input[type="password"]', ADMIN_PIN);
    await page.click('button:has-text("Login")');
    await expect(page.locator('div[role="status"]').filter({ hasText: 'admin' })).toBeVisible();

    // 1. Product Management
    await page.click('button[role="menuitem"]:has-text("Products")');
    await page.click('button:has-text("Add Product")');
    const productName = 'Test Burger ' + Math.floor(Math.random() * 1000);
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="price"]', '150');
    await page.fill('input[name="stock"]', '50');
    await page.click('button:has-text("Save")');
    await expect(page.locator(`text=${productName}`)).toBeVisible();

    // 2. CRM Setup
    await page.click('button[role="menuitem"]:has-text("Customers")');
    await page.click('button:has(svg.lucide-plus)');
    const customerPhone = '9000000001';
    await page.fill('input[placeholder="e.g. John Doe"]', 'Test Customer');
    await page.fill('input[placeholder="+1 234 567 8900"]', customerPhone);
    await page.selectOption('select:near(label:has-text("Price Tier"))', 'wholesale'); // Wholesale gives discount
    await page.click('button:has-text("Create Customer")');
    await expect(page.locator('text=Test Customer')).toBeVisible();

    // Close CRM
    await page.click('div[role="dialog"] button:has(svg.lucide-x)');

    // 3. POS Operations
    await page.click('button[role="menuitem"]:has-text("POS")');

    // Add product to cart
    await page.locator(`button[role="gridcell"]`).filter({ hasText: productName }).click();
    await expect(page.getByRole('listitem').filter({ hasText: productName })).toBeVisible();
    await expect(page.getByText('1 items')).toBeVisible();

    // Customer Lookup by Phone in Name field
    const customerNameInput = page.locator('#customer-name');
    await customerNameInput.fill(customerPhone);
    await page.waitForTimeout(2000); // Wait for lookup
    // Verify customer name is updated in the input
    await expect(customerNameInput).toHaveValue('Test Customer');

    // Verify Wholesale discount applied
    await expect(page.locator('text=Discount')).toBeVisible();

    // Add another item
    await page.locator('button[role="gridcell"]').filter({ hasText: 'Coffee' }).click();

    // Hold Order
    await page.click('button:has-text("Hold")');
    await expect(page.locator('text=Cart is empty')).toBeVisible();

    // View Held Orders
    await page.click('button[aria-label="View held orders"]');
    await expect(page.locator('#held-orders-title')).toBeVisible();
    await page.click('button:has-text("Restore")');
    await expect(page.getByRole('listitem').filter({ hasText: productName })).toBeVisible();

    // Split Payment
    await page.getByRole('button', { name: 'split', exact: true }).click();
    await page.locator('div:has(> span:has-text("cash")) input').fill('50');

    // The rest for card
    const totalText = await page.locator('[aria-label^="Total amount"]').innerText();
    const totalVal = parseFloat(totalText.replace(/[^0-9.]/g, ''));
    await page.locator('div:has(> span:has-text("card")) input').fill((totalVal - 50).toFixed(2));
    await page.getByRole('button', { name: 'Confirm Split' }).click();

    // Complete Checkout
    await page.locator('button[data-checkout-button]').click();
    await expect(page.locator('text=Order Complete!')).toBeVisible();
    await page.click('button[aria-label="Close and start new order"]');

    // 4. Verify in Orders
    await page.click('button[role="menuitem"]:has-text("Orders")');
    await expect(page.locator('.card').first()).toBeVisible();

    // 5. Logout
    // Try both methods since button might be covered
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Logout') || b.getAttribute('aria-label') === 'Logout');
      if (btn) btn.click();
    });
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('Cashier Access Restrictions', async ({ page }) => {
    // Login as Cashier
    await page.fill('input[type="password"]', CASHIER_PIN);
    await page.click('button:has-text("Login")');
    await expect(page.locator('div[role="status"]').filter({ hasText: 'cashier' })).toBeVisible();

    // Try to access Settings (should be hidden or restricted)
    const settingsItem = page.locator('button[role="menuitem"]:has-text("Settings")');
    await expect(settingsItem).not.toBeVisible();

    // Try to access Logs
    const logsItem = page.locator('button[role="menuitem"]:has-text("Logs")');
    await expect(logsItem).not.toBeVisible();

    // Verify POS works
    await page.click('button[role="menuitem"]:has-text("POS")');
    await expect(page.locator('#cart-title')).toBeVisible();
  });
});
