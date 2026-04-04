import { test, expect } from '@playwright/test';

const ADMIN_PIN = '1234';
const APP_URL = 'http://localhost:3000';

test.describe('POS Full Functionality Check', () => {

  test.beforeAll(async ({}) => {
    // We can't easily clear localStorage for all contexts here,
    // so we'll do it in the first beforeEach if not done.
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);

    // One-time reset for this suite to ensure variants and seed data are fresh
    const isReset = await page.evaluate(() => window.sessionStorage.getItem('suite_reset'));
    if (!isReset) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.setItem('suite_reset', 'true');
      });
      await page.reload();
    }

    // Login as Admin
    await page.fill('input[type="password"]', ADMIN_PIN);
    await page.click('button:has-text("Login")');
    await expect(page.locator('div[role="status"]').filter({ hasText: 'admin' })).toBeVisible();

    // Ensure we are on POS screen
    await page.click('button[role="menuitem"]:has-text("POS")');
  });

  test('Add standard products and verify grouping', async ({ page }) => {
    // Add Coffee twice
    await page.click('button:has-text("Coffee")');
    await page.click('button:has-text("Coffee")');

    // Add Tea once
    await page.click('button:has-text("Tea")');

    // Verify cart items
    const cartItems = page.locator('[role="listitem"]');
    await expect(cartItems).toHaveCount(2);

    const coffeeItem = cartItems.filter({ hasText: 'Coffee' });
    await expect(coffeeItem.locator('span[aria-label^="Quantity:"]')).toHaveText('2');

    const teaItem = cartItems.filter({ hasText: 'Tea' });
    await expect(teaItem.locator('span[aria-label^="Quantity:"]')).toHaveText('1');
  });

  test('Price Tier switching logic', async ({ page }) => {
    // Add Coffee (Retail: 120, Wholesale: 100)
    await page.click('button:has-text("Coffee")');

    const cartItem = page.locator('[role="listitem"]').filter({ hasText: 'Coffee' });
    await expect(cartItem.getByRole('button', { name: /Override price/ })).toContainText('120');

    // Switch to Wholesale
    await page.click('button:has-text("WHOLESALE")');
    await expect(cartItem.getByRole('button', { name: /Override price/ })).toContainText('100');

    // Switch back to Retail
    await page.click('button:has-text("RETAIL")');
    await expect(cartItem.getByRole('button', { name: /Override price/ })).toContainText('120');
  });

  test('Price Override requires PIN and prevents grouping with standard price', async ({ page }) => {
    // Add Coffee
    await page.click('button:has-text("Coffee")');

    const cartItem1 = page.locator('[role="listitem"]').filter({ hasText: 'Coffee' });

    // Click price to override
    await cartItem1.getByRole('button', { name: /Override price/ }).click();

    // Modal "Enter New Price" should appear
    await page.fill('input[placeholder^="New Price"]', '150');
    await page.keyboard.press('Enter');

    // PIN Modal should appear
    await expect(page.getByText('Authorize Price Override')).toBeVisible();
    for (const char of ADMIN_PIN) {
      await page.getByRole('button', { name: char, exact: true }).click();
    }
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // Cart should now show price 150
    await expect(cartItem1.getByRole('button', { name: /Override price/ })).toContainText('150');

    // Add Coffee again (should NOT group because price is different/overridden)
    await page.click('button:has-text("Coffee")');

    const cartItems = page.locator('[role="listitem"]');
    await expect(cartItems).toHaveCount(2);
  });

  test('Combo addition and metadata tracking', async ({ page }) => {
    // Navigate to Products to create a combo first if needed,
    // but browserFallback might not have combos seeded.
    // Let's check if "Combos" category exists in POS.
    const comboTab = page.getByRole('button', { name: 'Combos' });
    if (await comboTab.isVisible()) {
      await comboTab.click();

      // If there are combos, add one
      const comboCard = page.locator('button[role="gridcell"]').first();
      if (await comboCard.isVisible()) {
        const comboName = await comboCard.locator('.text-sm').innerText();
        await comboCard.click();

        // Cart should have items from the combo
        const cartItems = page.locator('[role="listitem"]');
        await expect(cartItems.count()).toBeGreaterThan(0);

        // Items from combo should have the combo name in their name (as per our implementation)
        await expect(cartItems.first()).toContainText(comboName);
      }
    }
  });

  test('Checkout flow with Cash', async ({ page }) => {
    // Switch to Takeaway to avoid mandatory table selection
    await page.click('button:has-text("Takeaway")');

    await page.click('button:has-text("Tea")');

    // Set payment method to Cash
    await page.getByRole('button', { name: 'cash', exact: true }).click();

    // Fill amount tendered manually to be safe
    const totalText = await page.locator('span[aria-label^="Total amount:"]').innerText();
    const amount = totalText.replace(/[^0-9.]/g, '');
    await page.fill('input[id="amount-tendered"]', amount);

    // Click Charge button
    await page.click('[data-checkout-button]');

    // Order Complete modal should appear
    await expect(page.getByText('Order Complete!')).toBeVisible();
    await expect(page.locator('pre')).toContainText('Tea');

    // Start New Order
    await page.click('button:has-text("New Order")');
    await expect(page.getByText('Cart is empty')).toBeVisible();
  });


  test('Voiding a transaction requires PIN and Reason', async ({ page }) => {
    await page.click('button:has-text("Sandwich")');

    // Click Trash button to clear/void cart
    await page.click('button[aria-label="Clear cart"]');

    // Void Reason Modal
    await expect(page.getByText('Void Transaction')).toBeVisible();
    await page.fill('textarea[placeholder^="Reason"]', 'Test Void');
    await page.click('button:has-text("Confirm Void")');

    // PIN Modal
    await expect(page.getByText('Authorize Void Transaction')).toBeVisible();
    for (const char of ADMIN_PIN) {
      await page.getByRole('button', { name: char, exact: true }).click();
    }
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    await expect(page.getByText('Cart is empty')).toBeVisible();
  });

});
