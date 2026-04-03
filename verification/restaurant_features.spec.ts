import { test, expect } from '@playwright/test';

test('Restaurant Flow: Table Selection, Auto-KOT, and KDS', async ({ page }) => {
  // Set up dialog handler for alerts (e.g. "KOT sent to printer")
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });

  await page.goto('http://localhost:3000');

  // Login
  await page.fill('input[type="password"]', '1234');
  await page.click('button:has-text("Login")');

  // 1. Go to Table Manager and start an order
  const tablesNav = page.locator('button[aria-label="Tables"]');
  await expect(tablesNav).toBeVisible({ timeout: 20000 });
  await tablesNav.click();

  await expect(page.getByText('Table Manager')).toBeVisible({ timeout: 20000 });

  // Start Order on Table 1
  const startOrderBtn = page.getByTestId('start-order-Table 1');
  await expect(startOrderBtn).toBeVisible({ timeout: 10000 });
  await startOrderBtn.click();

  // 2. POS: Check Table 1 is selected and add items
  await page.waitForTimeout(1000); // Allow navigation and state update
  const selectTableBtn = page.getByTestId('select-table-btn');
  await expect(selectTableBtn).toBeVisible({ timeout: 30000 });
  await expect(selectTableBtn).toContainText('Table 1');

  // Add items
  const coffeeBtn = page.locator('button:has-text("Coffee")').first();
  const sandwichBtn = page.locator('button:has-text("Sandwich")').first();

  await expect(coffeeBtn).toBeVisible({ timeout: 10000 });
  await coffeeBtn.click();
  await sandwichBtn.click();

  // Send KOT
  await page.click('button[aria-label="Print Kitchen Order Ticket"]');

  // 3. KDS: Verify and manage order
  await page.click('button[aria-label="Kitchen"]');
  await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

  // Explicitly refresh to see the new order immediately
  await page.click('button[title="Refresh"]');
  await page.waitForTimeout(1000);

  // Wait for Table 1 order card
  const orderCard = page.locator('div.card', { hasText: 'Table 1' }).first();
  await expect(orderCard).toBeVisible({ timeout: 20000 });

  // Start preparing Coffee
  const prepBtn = orderCard.getByTestId('kds-start-prep-Coffee');
  await expect(prepBtn).toBeVisible({ timeout: 5000 });
  await prepBtn.click();

  // Verify Preparing status (Prep)
  await expect(orderCard.getByText('Prep')).toBeVisible({ timeout: 10000 });

  // Mark Coffee as done
  const doneBtn = orderCard.getByTestId('kds-mark-done-Coffee');
  await expect(doneBtn).toBeVisible({ timeout: 5000 });
  await doneBtn.click();

  // Complete the entire order
  await page.click('button:has-text("Complete Order")');

  // 4. Orders Screen: Verify DINE_IN order
  await page.click('button[aria-label="Orders"]');
  await expect(page.getByText('DINE_IN').first()).toBeVisible({ timeout: 10000 });
});
