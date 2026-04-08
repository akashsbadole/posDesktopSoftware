import { test, expect } from '@playwright/test';

test('Khatabook (Digital Ledger) Credit Lifecycle', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.goto('http://localhost:3000');

  // Wait for either login or main screen
  await page.waitForFunction(() =>
    document.querySelector('input[type="password"]') ||
    document.querySelector('[data-testid="edit-customer-btn"]') ||
    document.body.innerText.includes('License Agreement')
  );

  // Login
  const pinInput = page.locator('input[type="password"]');
  if (await pinInput.isVisible()) {
    await pinInput.fill('1234');
    await page.getByRole('button', { name: 'Login' }).click();
  }

  // Handle onboarding if visible
  const licenseAgreetment = page.getByText('License Agreement');
  if (await licenseAgreetment.isVisible({ timeout: 10000 }).catch(() => false)) {
    await page.getByText('I have read and agree to the license terms').click();
    await page.getByRole('button', { name: 'Continue' }).click(); // To Industry
    await page.getByRole('button', { name: 'Continue' }).click(); // To Identity
    await page.getByPlaceholder('e.g. Downtown Cafe').fill('Test Store');
    await page.getByRole('button', { name: 'Continue' }).click(); // To Regional
    await page.getByRole('button', { name: 'Continue' }).click(); // To Tax
    await page.getByRole('button', { name: 'Continue' }).click(); // To Branding
    await page.getByRole('button', { name: 'Get Started' }).click();
  }

  // 1. Add Customer via CRM first to ensure they exist for Store Credit
  await page.getByRole('menuitem', { name: 'Customers' }).click();
  await page.getByTestId('add-customer-btn').click();
  await page.getByPlaceholder('e.g. John Doe').fill('Test Khata Customer');
  await page.getByPlaceholder('+1 234 567 8900').fill('9876543210');
  await page.getByRole('button', { name: 'Create Customer' }).click();

  // 2. Go to POS and select the customer
  await page.getByRole('menuitem', { name: 'POS' }).click();
  await page.getByTestId('edit-customer-btn').click();
  await page.getByPlaceholder('Phone').fill('9876543210');
  // Wait for lookup
  await page.waitForTimeout(2000);
  await page.getByText('Close Editor').click();

  // Switch to Takeaway to avoid mandatory table selection
  await page.getByRole('button', { name: 'Takeaway' }).click();

  // 3. Add item to cart
  await page.getByText('Coffee').first().click();

  // 4. Checkout with Store Credit
  await page.getByRole('button', { name: 'Credit' }).click();
  await page.getByTestId('checkout-button').click();

  // 5. Verify Receipt
  await expect(page.getByText('Order Complete!')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('Close and start new order').click();

  // 6. Open CRM and Check Ledger
  await page.getByRole('menuitem', { name: 'Customers' }).click();
  await page.getByText('Test Khata Customer').first().click();
  await page.getByTestId('tab-ledger').click();

  // 7. Verify Unpaid Bill
  await expect(page.getByText('Total Udhar (Due)')).toBeVisible();
  await expect(page.getByText('Unpaid').first()).toBeVisible();

  // 8. Settle Bill (Jama)
  const settleBtn = page.locator('[data-testid^="settle-btn-"]').first();
  await expect(settleBtn).toBeVisible();
  await expect(settleBtn).toBeEnabled();
  await settleBtn.click();

  // Wait for the ledger to update
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'verification/ledger_after_settle_final.png' });
  await expect(page.getByText('No outstanding dues for this customer.')).toBeVisible({ timeout: 15000 });

  // 9. Verify Wallet Balance adjustment
  await expect(page.getByTestId('total-due')).toContainText('0.00');
});
