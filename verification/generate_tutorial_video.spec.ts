import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function showStep(page: Page, text: string) {
  await page.evaluate((msg) => {
    let el = document.getElementById('tutorial-step');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial-step';
      el.style.position = 'fixed';
      el.style.bottom = '20px';
      el.style.right = '20px';
      el.style.pointerEvents = 'none';
      el.style.backgroundColor = 'rgba(245, 200, 66, 0.9)';
      el.style.color = '#0D0D0F';
      el.style.padding = '12px 24px';
      el.style.borderRadius = '8px';
      el.style.zIndex = '10000';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '18px';
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      el.style.transition = 'all 0.3s ease';
      document.body.appendChild(el);
    }
    el.innerText = msg;
  }, text);
  await page.waitForTimeout(2000);
}

async function loginAndReady(page: Page) {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        const ENCRYPTION_KEY = "pos-tauri-encryption-key-2026";
        const encrypt = (data: string) => {
            // Mock encryption or just return raw if CryptoJS not available in evaluate
            // Actually, lib/db.ts uses CryptoJS. Let's try to just provide raw and hope fallback works
            return data;
        };

        localStorage.clear();
        localStorage.setItem('pos_initialized', 'true');
        localStorage.setItem('pos_organizations', JSON.stringify([{
            id: 'tutorial-org',
            name: 'Tutorial Restaurant',
            email: 'tutorial@appixen.com',
            created_at: new Date().toISOString(),
            status: 'trial'
        }]));
        localStorage.setItem('pos_users', JSON.stringify([{
            id: 'admin',
            organization_id: 'tutorial-org',
            name: 'Administrator',
            email: 'tutorial@appixen.com',
            password: 'password123',
            role: 'admin',
            hourly_rate: 0,
            pin: '1234'
        }]));
        // Mark onboarding done to skip it in part 2/3
        localStorage.setItem('pos_settings_v2', JSON.stringify({
            'default': {
                store_name: 'Tutorial Store',
                onboarding_completed: true,
                license_agreed: true,
                currency_symbol: '$'
            }
        }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    const orgBtn = page.getByText('Tutorial Restaurant');
    await orgBtn.waitFor({ state: 'visible', timeout: 10000 });
    await orgBtn.click();
    await page.waitForSelector('input#pin-input', { timeout: 10000 });
    await page.fill('input#pin-input', '1234');
    await page.click('button:has-text("Enter POS")');
}

test.use({
  viewport: { width: 1024, height: 768 },
  video: {
    mode: 'on',
    size: { width: 1024, height: 768 }
  }
});

test('Tutorial Part 1: Setup & POS', async ({ page }) => {
  test.setTimeout(300000);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('pos_initialized', 'true');
      localStorage.setItem('pos_organizations', JSON.stringify([]));
      localStorage.setItem('pos_users', JSON.stringify([]));
  });
  await page.reload({ waitUntil: 'networkidle' });

  await showStep(page, 'Step 1: Register your Business');
  await page.click('text=Register New Organization', { timeout: 5000 }).catch(() => page.click('text=Register'));
  await page.fill('input#orgName', 'Tutorial Restaurant');
  await page.fill('input#email', 'tutorial@appixen.com');
  await page.fill('input#password', 'password123');
  await page.fill('input#confirmPassword', 'password123');
  await page.click('button:has-text("Create Account")');

  await showStep(page, 'Step 2: Secure Access with PIN');
  await page.waitForSelector('input#pin-input');
  await page.fill('input#pin-input', '1234');
  await page.click('button:has-text("Enter POS")');

  await showStep(page, 'Step 3: Quick Onboarding');
  if (await page.isVisible('text=License Agreement')) {
    await page.click('text=I have read and agree to the license terms');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.click('text=Food & Beverage');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="e.g. Downtown Cafe"]', 'Main Branch');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(2000);
  }

  await showStep(page, 'Step 4: Using the POS Screen');
  await page.waitForSelector('text=Cart');
  await page.locator('button[role="gridcell"]').first().click();
  await page.locator('button[role="gridcell"]').nth(1).click();

  await showStep(page, 'Quick Checkout');
  await page.click('button:has-text("COPY")', { force: true }).catch(() => {});
  const checkoutBtn = page.locator('button[data-checkout-button]');
  if (await checkoutBtn.isEnabled()) {
      await checkoutBtn.click();
      await page.waitForSelector('text=Order Complete!', { timeout: 10000 });
      await page.click('button[aria-label="Close and start new order"]');
  }

  // VISIT ALL SCREENS HERE to ensure they are captured in one go if part 2/3 login fails
  const features = [
    { name: 'Dashboard', step: 'Business Analytics & Dashboard' },
    { name: 'Orders', step: 'Order History & Tracking' },
    { name: 'Products', step: 'Menu & Product Management' },
    { name: 'Tables', step: 'Visual Table Management' },
    { name: 'Bookings', step: 'Table Reservations' },
    { name: 'Kitchen', step: 'Kitchen Display System (KDS)' },
    { name: 'Customers', step: 'Customer CRM & Loyalty' },
    { name: 'Expenses', step: 'Expense Tracking' },
    { name: 'Ingredients', step: 'Inventory & Stock Items' },
    { name: 'Suppliers', step: 'Vendor Management' },
    { name: 'PO', step: 'Purchase Orders' },
    { name: 'Wallet', step: 'Customer Digital Wallets' },
    { name: 'Coupons', step: 'Discounts & Coupon Codes' },
    { name: 'Alerts', step: 'Inventory Low Stock Alerts' },
    { name: 'Inventory', step: 'Full Inventory Management' },
    { name: 'Refunds', step: 'Refund Request Management' },
    { name: 'Staff', step: 'Staff Attendance & Payroll' },
    { name: 'Schedule', step: 'Staff Scheduling' },
    { name: 'Reconciliation', step: 'Day-End Cash Reconciliation' },
    { name: 'Reports', step: 'Comprehensive Reports' },
    { name: 'GST', step: 'Tax & GST Compliance' },
    { name: 'Logs', step: 'Activity & Audit Logs' },
    { name: 'Stores', step: 'Multi-Store Management' },
    { name: 'Settings', step: 'System Configuration' },
    { name: 'Support', step: 'Training & Support Center' }
  ];

  for (const feature of features) {
    await showStep(page, feature.step);
    // Use the custom 'navigate' event for reliable screen switching
    await page.evaluate((screenId) => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: screenId }));
    }, feature.name.toLowerCase() === 'po' ? 'purchase_orders' :
       feature.name.toLowerCase() === 'bookings' ? 'reservations' :
       feature.name.toLowerCase() === 'kitchen' ? 'kds' :
       feature.name.toLowerCase() === 'schedule' ? 'scheduling' :
       feature.name.toLowerCase() === 'reconciliation' ? 'reconciliation' :
       feature.name.toLowerCase() === 'alerts' ? 'inventory_alerts' :
       feature.name.toLowerCase() === 'refunds' ? 'refund_requests' :
       feature.name.toLowerCase());

    await page.waitForTimeout(2000);
    if (await page.isVisible('text=Upgrade to Premium')) {
        await page.keyboard.press('Escape');
    }
  }

  await showStep(page, 'Part 1 Complete: Setup and Sales ready!');
  await page.waitForTimeout(2000);
});

test('Tutorial Part 2: Management Tools', async ({ page }) => {
  test.setTimeout(180000);
  await loginAndReady(page);

  const features = [
    { name: 'Dashboard', step: 'Business Analytics & Dashboard' },
    { name: 'Orders', step: 'Order History & Tracking' },
    { name: 'Products', step: 'Menu & Product Management' },
    { name: 'Tables', step: 'Visual Table Management' },
    { name: 'Bookings', step: 'Table Reservations' },
    { name: 'Kitchen', step: 'Kitchen Display System (KDS)' },
    { name: 'Customers', step: 'Customer CRM & Loyalty' },
    { name: 'Expenses', step: 'Expense Tracking' },
    { name: 'Ingredients', step: 'Inventory & Stock Items' }
  ];

  for (const feature of features) {
    await showStep(page, feature.step);
    const btn = page.getByRole('menuitem', { name: feature.name, exact: true });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(2000);
    if (await page.isVisible('text=Upgrade to Premium')) {
        await page.keyboard.press('Escape');
    }
  }

  await showStep(page, 'Part 2 Complete: Management tools covered.');
  await page.waitForTimeout(2000);
});

test('Tutorial Part 3: Advanced Features & Admin', async ({ page }) => {
  test.setTimeout(180000);
  await loginAndReady(page);

  const features = [
    { name: 'Suppliers', step: 'Vendor Management' },
    { name: 'PO', step: 'Purchase Orders' },
    { name: 'Wallet', step: 'Customer Digital Wallets' },
    { name: 'Coupons', step: 'Discounts & Coupon Codes' },
    { name: 'Alerts', step: 'Inventory Low Stock Alerts' },
    { name: 'Inventory', step: 'Full Inventory Management' },
    { name: 'Refunds', step: 'Refund Request Management' },
    { name: 'Staff', step: 'Staff Attendance & Payroll' },
    { name: 'Schedule', step: 'Staff Scheduling' },
    { name: 'Reconciliation', step: 'Day-End Cash Reconciliation' },
    { name: 'Reports', step: 'Comprehensive Reports' },
    { name: 'GST', step: 'Tax & GST Compliance' },
    { name: 'Logs', step: 'Activity & Audit Logs' },
    { name: 'Stores', step: 'Multi-Store Management' },
    { name: 'Settings', step: 'System Configuration' },
    { name: 'Support', step: 'Training & Support Center' }
  ];

  for (const feature of features) {
    await showStep(page, feature.step);
    const btn = page.getByRole('menuitem', { name: feature.name, exact: true });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(2000);
    if (await page.isVisible('text=Upgrade to Premium')) {
        await page.keyboard.press('Escape');
    }
  }

  await showStep(page, 'Tutorial Complete! Powered by AppIXEN.');
  await page.waitForTimeout(2000);
});
