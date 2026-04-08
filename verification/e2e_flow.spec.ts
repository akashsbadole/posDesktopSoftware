import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('End-to-End Flow Verification', () => {
  test('Complete Registration, Login and POS Transaction', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Go to App
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    console.log('Registering...');
    await page.click('text=Register');
    await page.fill('#orgName', 'Test POS Systems');
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('button:has-text("Create Account")');

    // 2. PIN View
    console.log('Waiting for PIN view...');
    await page.waitForSelector('#pin-input', { timeout: 20000 });
    await page.screenshot({ path: 'verification/screenshots/flow_1_pin_view.png' });

    await page.fill('#pin-input', '1234');
    await page.click('button:has-text("Enter POS")');

    // 3. Onboarding (if it appears)
    console.log('Checking for Onboarding...');
    const onboardingVisible = await page.isVisible('text=Welcome to POS Billing', { timeout: 10000 }).catch(() => false);
    if (onboardingVisible) {
        console.log('Completing Onboarding...');
        // Step 1: License
        await page.click('button:has-text("I Agree & Continue")');
        // Step 2: Store Info
        await page.click('button:has-text("Next Step")');
        // Step 3: Localization
        await page.click('button:has-text("Next Step")');
        // Step 4: Tax
        await page.click('button:has-text("Next Step")');
        // Step 5: Industry
        await page.click('button:has-text("Next Step")');
        // Step 6: Final
        await page.click('button:has-text("Complete Setup")');
    }

    // 4. POS Screen
    console.log('Waiting for POS...');
    await page.waitForSelector('button[role="menuitem"]:has-text("POS")', { timeout: 20000 });
    await page.screenshot({ path: 'verification/screenshots/flow_2_pos_loaded.png' });

    // 5. Add Product
    console.log('Adding product to cart...');
    // The seed data should have Coffee
    const coffeeBtn = page.locator('button[role="gridcell"]:has-text("Coffee")').first();
    await coffeeBtn.click();

    // 6. Checkout
    console.log('Checking out...');
    await page.click('button[data-checkout-button]');

    // 7. Verify Receipt
    await page.waitForSelector('text=Order Complete!');
    await page.screenshot({ path: 'verification/screenshots/flow_3_order_complete.png' });
    await page.click('button[aria-label="Close and start new order"]');

    // 8. CRUD Operations Verification
    // Products
    console.log('Testing Products CRUD...');
    await page.click('button[role="menuitem"]:has-text("Products")');
    await page.click('button:has-text("Add Product")');
    const productName = 'New Test Item ' + Date.now();
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="stock"]', '100');
    await page.click('button:has-text("Save")');
    await expect(page.locator(`text=${productName}`)).toBeVisible();

    // Edit Product
    await page.click(`tr:has-text("${productName}") button[aria-label="Edit product"]`);
    await page.fill('input[name="price"]', '149.99');
    await page.click('button:has-text("Save")');
    await expect(page.locator(`tr:has-text("${productName}"):has-text("149.99")`)).toBeVisible();

    // Delete Product
    await page.click(`tr:has-text("${productName}") button[aria-label="Delete product"]`);
    page.on('dialog', dialog => dialog.accept());
    // The above might not work if it's a custom modal, but based on code it's window.confirm
    await expect(page.locator(`text=${productName}`)).not.toBeVisible();

    console.log('All tests passed!');
  });
});
