import { test, expect } from '@playwright/test';

test('verify CRM and POS integration', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3000');

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="password"]', '1234');
  await page.click('button:has-text("Login")');

  // Wait for the app to load
  await expect(page.getByText('Point of Sale')).toBeVisible();

  // Open CRM
  await page.click('button[role="menuitem"]:has-text("Customers")');
  await expect(page.getByRole('heading', { name: 'Customer Relationship Management' })).toBeVisible();

  // Add a customer
  await page.click('button:has(svg.lucide-plus)');
  await page.fill('input[placeholder="e.g. John Doe"]', 'Jane Doe');
  await page.fill('input[placeholder="+1 234 567 8900"]', '9876543210');
  await page.fill('input[placeholder="john@example.com"]', 'jane@example.com');
  // Price tier: wholesale gives discount
  await page.selectOption('select:near(label:has-text("Price Tier"))', 'wholesale');
  await page.click('button:has-text("Create Customer")');

  // Select the customer
  await page.click('text=Jane Doe');
  await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible();
  await page.screenshot({ path: 'crm_customer_details.png' });

  // Check different tabs
  await page.click('button:has-text("Addresses")');
  await page.screenshot({ path: 'crm_addresses_tab.png' });

  // Close CRM - Click the X button in the top right of the modal
  await page.click('div[role="dialog"] button:has(svg.lucide-x)');

  // Go to POS and search for the customer
  await page.click('button[role="menuitem"]:has-text("POS")');

  // Search for the customer by phone in the "Walk-in Customer" input
  await page.fill('input[placeholder="Walk-in Customer"]', '9876543210');

  // Wait for lookup to trigger
  await page.waitForTimeout(2000);

  // Verify customer name is now shown instead of placeholder
  await expect(page.locator('input#customer-name')).toHaveValue('Jane Doe');

  await page.screenshot({ path: 'pos_customer_lookup.png' });
});
