import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Backup & Restore cycle', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Login
  await page.fill('input[type="password"]', '1234');
  await page.click('button:has-text("Login")');

  // Setup dialog handler for Reset Database confirms
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  // 1. Add a unique product to ensure backup contains it
  await page.click('button[aria-label="Products"]');
  await page.click('button:has-text("Add Product")');
  const uniqueName = `BackupTest-${Date.now()}`;
  await page.fill('input[name="name"]', uniqueName);
  await page.fill('input[name="price"]', '99.99');
  await page.click('button:has-text("Save")');
  await expect(page.getByText(uniqueName)).toBeVisible();

  // 2. Go to Settings and Export Backup
  await page.click('button[aria-label="Settings"]');

  // Start waiting for download before clicking
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Export Backup")');
  const download = await downloadPromise;
  const downloadPath = path.join('verification', 'temp_backup.gz');
  await download.saveAs(downloadPath);

  // 3. Clear Database (Reset)
  await page.click('button:has-text("Reset Database")');
  await page.waitForTimeout(1000); // Allow reset to process

  // Verify reset - product should be gone
  await page.click('button[aria-label="Products"]');
  await expect(page.getByText(uniqueName)).not.toBeVisible();

  // 4. Restore from Backup
  await page.click('button[aria-label="Settings"]');
  // Upload the file to the first file input
  await page.setInputFiles('input[type="file"]', downloadPath);

  await expect(page.getByText(/Imported|Restored/)).toBeVisible({ timeout: 10000 });

  // 5. Verify product is back
  await page.click('button[aria-label="Products"]');
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });

  // Cleanup
  if (fs.existsSync(downloadPath)) {
    fs.unlinkSync(downloadPath);
  }
});
