import { test, expect } from '@playwright/test';

test('verify pos shortcuts in modal', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for loading to finish
  await page.waitForTimeout(2000);

  // Handle potential registration/onboarding if state is fresh
  const isRegistration = await page.isVisible('text=Create your Account');
  if (isRegistration) {
    await page.fill('placeholder=Store Name', 'Test Store');
    await page.fill('placeholder=Full Name', 'Admin');
    await page.fill('placeholder=Email', 'admin@example.com');
    await page.fill('placeholder=Password', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);
  }

  // Handle PIN modal
  const isPinModal = await page.isVisible('text=Enter System PIN');
  if (isPinModal) {
    for (const digit of ['1', '2', '3', '4']) {
      await page.click(`button:has-text("${digit}")`);
    }
    await page.click('button:has-text("OK")');
    await page.waitForTimeout(2000);
  }

  // Handle Onboarding if visible
  const isOnboarding = await page.isVisible('text=Welcome to POS');
  if (isOnboarding) {
    while (await page.isVisible('button:has-text("Next")')) {
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);
    }
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(2000);
  }

  // Take screenshot before pressing ?
  await page.screenshot({ path: '/home/jules/verification/pos_screen_before.png' });

  // Press '?' to open shortcuts modal
  await page.keyboard.press('?');
  await page.waitForTimeout(2000);

  // Take screenshot of the modal
  await page.screenshot({ path: '/home/jules/verification/shortcuts_modal_final.png' });

  // Verify POS Screen shortcuts are present
  const content = await page.textContent('body');
  expect(content).toContain('Alt+1-5');
  expect(content).toContain('Alt+Q');
  expect(content).toContain('F9');
  expect(content).toContain('F10');
  expect(content).toContain('F12');
});
