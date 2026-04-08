import { chromium } from 'playwright';

const APP_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('--- STARTING COMPREHENSIVE AUDIT V3 ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('1. Clearing state and registering');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    await page.click('text=Register', { timeout: 10000 });
    await page.fill('input#orgName', 'Audit Org');
    await page.fill('input#email', 'audit@test.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password123');
    await page.click('button:has-text("Create Account")');

    console.log('2. PIN Entry');
    await page.waitForSelector('input#pin-input', { timeout: 20000 });
    await page.fill('input#pin-input', '1234');
    await page.click('button:has-text("Enter POS")');

    console.log('3. Onboarding');
    await page.waitForTimeout(3000);
    if (await page.isVisible('text=License Agreement')) {
      await page.click('text=I have read and agree to the license terms');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await page.click('text=Food & Beverage');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await page.fill('input[placeholder="e.g. Downtown Cafe"]', 'Audit Store');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Get Started")');
      await page.waitForTimeout(4000);
    }

    if (await page.isVisible('input#pin-input')) {
        await page.fill('input#pin-input', '1234');
        await page.click('button:has-text("Enter POS")');
    }

    console.log('4. POS & Table Selection');
    await page.waitForSelector('text=Cart', { timeout: 30000 });
    await page.click('button[role="gridcell"]:has-text("Coffee")');

    console.log(' - Selecting Table');
    await page.click('button[data-testid="select-table-btn"]');
    await page.waitForSelector('text=Select Table');
    await page.click('button[data-testid^="table-option-"]:has-text("Table 1")');

    console.log(' - Handling Cash Tendered');
    await page.click('button:has-text("COPY")');

    await page.screenshot({ path: 'verification/screenshots/audit_v3_pos_ready.png' });

    console.log('5. Checkout');
    await page.click('button[data-checkout-button]');
    await page.waitForSelector('text=Order Complete!', { timeout: 15000 });
    await page.screenshot({ path: 'verification/screenshots/audit_v3_receipt.png' });
    await page.click('button[aria-label="Close and start new order"]');

    console.log('6. Screen Crawl');
    const navItems = [
      { name: 'Dashboard', file: 'audit_v3_dashboard.png' },
      { name: 'Orders', file: 'audit_v3_orders.png' },
      { name: 'Products', file: 'audit_v3_products.png' },
      { name: 'Tables', file: 'audit_v3_tables.png' },
      { name: 'Customers', file: 'audit_v3_customers.png' },
      { name: 'Expenses', file: 'audit_v3_expenses.png' },
      { name: 'Staff', file: 'audit_v3_staff.png' },
      { name: 'Ingredients', file: 'audit_v3_ingredients.png' },
      { name: 'Suppliers', file: 'audit_v3_suppliers.png' },
      { name: 'PO', file: 'audit_v3_po.png' },
      { name: 'Wallet', file: 'audit_v3_wallet.png' },
      { name: 'Coupons', file: 'audit_v3_coupons.png' },
      { name: 'Reports', file: 'audit_v3_reports.png' },
      { name: 'Settings', file: 'audit_v3_settings.png' },
      { name: 'Support', file: 'audit_v3_support.png' }
    ];

    for (const item of navItems) {
      console.log(` - ${item.name}`);
      const btn = page.getByRole('menuitem', { name: item.name, exact: true });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(1500);

      if (await page.isVisible('text=Upgrade to Premium')) {
        await page.screenshot({ path: `verification/screenshots/locked_v3_${item.file}` });
        await page.keyboard.press('Escape');
      } else {
        await page.screenshot({ path: `verification/screenshots/${item.file}` });
      }
    }

    console.log('7. CRUD - Products');
    await page.click('button[role="menuitem"]:has-text("Products")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Add Product")');
    const productName = 'Audit Product ' + Date.now();
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="price"]', '100');
    await page.fill('input[name="stock"]', '50');
    await page.click('button:has-text("Save")');
    await page.waitForSelector(`text=${productName}`);

    await page.click(`tr:has-text("${productName}") button[aria-label="Edit product"]`);
    await page.fill('input[name="price"]', '150');
    await page.click('button:has-text("Save")');
    await page.waitForSelector(`tr:has-text("${productName}"):has-text("150")`);

    console.log('8. CRUD - Customers');
    await page.click('button[role="menuitem"]:has-text("Customers")');
    await page.waitForTimeout(500);
    await page.click('button:has(svg.lucide-plus)');
    const customerName = 'Audit Customer ' + Date.now();
    await page.fill('input[placeholder="e.g. John Doe"]', customerName);
    await page.fill('input[placeholder="+1 234 567 8900"]', '9876543210');
    await page.click('button:has-text("Create Customer")');
    await page.waitForSelector(`text=${customerName}`);

    console.log('--- AUDIT V3 SUCCESSFUL ---');
  } catch (err) {
    console.error('!!! AUDIT V3 FAILED !!!');
    console.error(err);
    await page.screenshot({ path: 'verification/screenshots/audit_v3_error.png' });
  } finally {
    await browser.close();
  }
})();
