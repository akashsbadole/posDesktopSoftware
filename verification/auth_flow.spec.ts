import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('Authentication - Login and Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Tauri environment and clear localStorage before each test
    await page.addInitScript(() => {
      (window as any).__TAURI__ = {};
      localStorage.clear();
    });
    await page.goto(APP_URL, { timeout: 60000 });
  });

  test('should register a new organization successfully', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Register');

    // Fill registration form
    await page.fill('#orgName', 'Test Organization');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');

    // Submit registration
    await page.click('button:has-text("Create Account")');

    // Wait for transition (longer wait)
    await page.waitForTimeout(5000);

    // Check if we're on PIN view by checking for the PIN input
    try {
      await page.waitForSelector('#pin-input', { timeout: 5000 });
    } catch {
      // Check if there's an error message
      const errorMsg = await page.locator('text=Registration failed').isVisible().catch(() => false);
      if (errorMsg) {
        throw new Error('Registration failed with error message');
      }
      throw new Error('Registration completed but PIN view not shown');
    }

    // Verify we're on the PIN entry screen
    await expect(page.locator('h1')).toContainText('Welcome back!');
    await expect(page.locator('p')).toContainText('Test Organization');
  });

  test('should show error for password mismatch during registration', async ({ page }) => {
    await page.click('text=Register');

    await page.fill('#orgName', 'Test Organization');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'differentpassword');

    await page.click('button:has-text("Create Account")');

    // Should show error message
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should show error for short password during registration', async ({ page }) => {
    await page.click('text=Register');

    await page.fill('#orgName', 'Test Organization');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', '123');
    await page.fill('#confirmPassword', '123');

    await page.click('button:has-text("Create Account")');

    // Should show error message
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('should login with valid credentials and PIN', async ({ page }) => {
    // First register a user (this sets up the organization context)
    await page.click('text=Register');
    await page.fill('#orgName', 'Login Test Org');
    await page.fill('#email', 'login@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');
    await page.click('button:has-text("Create Account")');

    // Wait for PIN view and enter PIN
    await page.waitForSelector('#pin-input');
    await page.fill('#pin-input', '1234');
    await page.click('button:has-text("Enter POS")');

    // Should reach the main POS interface
    await page.waitForSelector('text=POS', { timeout: 20000 });

    // Check for license agreement screen (shown for new admin users)
    const licenseVisible = await page.locator('text=License Agreement').isVisible().catch(() => false);
    if (licenseVisible) {
      // Click the checkbox to agree to license
      await page.click('text=I have read and agree to the license terms');
      // Then click Continue
      await page.click('button:has-text("Continue")');
      
      // Wait for next screen and fill in necessary fields
      await page.waitForTimeout(1500);
      
      // Handle Store Identity step - fill in store name using evaluate
      // to bypass React's controlled input issues
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"]') as unknown as HTMLInputElement[];
        if (inputs[0]) inputs[0].value = 'Test Store';
        if (inputs[1]) inputs[1].value = '123 Test Street';
        if (inputs[2]) inputs[2].value = '+1 123 456 789';
        
        // Dispatch input events to notify React
        inputs.forEach((input: HTMLInputElement) => {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      
      // Wait a moment for the form to recognize the changes
      await page.waitForTimeout(500);
      
      // Keep clicking Continue/Complete until done
      for (let i = 0; i < 10; i++) {
        const continueBtn = page.locator('button:has-text("Continue")').first();
        const completeBtn = page.locator('button:has-text("Complete Setup")').first();
        
        if (await completeBtn.isVisible()) {
          await completeBtn.click();
          break;
        }
        
        if (await continueBtn.isVisible() && await continueBtn.isEnabled()) {
          await continueBtn.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      }
    }

    // Verify we're logged in (should see POS interface elements)
    await expect(page.locator('text=Point of Sale')).toBeVisible();
  });

  test('should show error for invalid email during credential login', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Continue")');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should show error for invalid PIN', async ({ page }) => {
    // First establish organization context by registering
    await page.click('text=Register');
    await page.fill('#orgName', 'PIN Test Org');
    await page.fill('#email', 'pin@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');
    await page.click('button:has-text("Create Account")');

    // Try invalid PIN
    await page.waitForSelector('#pin-input');
    await page.fill('#pin-input', '9999');
    await page.click('button:has-text("Enter POS")');

    // Should show error
    await expect(page.locator('text=Invalid PIN')).toBeVisible();
  });

  test('should enforce PIN attempt limits and lockout', async ({ page }) => {
    // First establish organization context
    await page.click('text=Register');
    await page.fill('#orgName', 'Lockout Test Org');
    await page.fill('#email', 'lockout@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');
    await page.click('button:has-text("Create Account")');

    await page.waitForSelector('#pin-input');

    // Attempt wrong PIN multiple times (3 attempts)
    for (let i = 0; i < 3; i++) {
      await page.fill('#pin-input', '9999');
      await page.click('button:has-text("Enter POS")');
      if (i < 2) {
        await page.waitForSelector('text=Invalid PIN');
      }
    }

    // Should be locked out
    await expect(page.locator('text=Too many failed attempts')).toBeVisible();

    // PIN input should be disabled
    await expect(page.locator('#pin-input')).toBeDisabled();

    // Wait for lockout to expire (would need to wait 60 seconds in real scenario)
    // For testing purposes, we just verify the lockout message appears
  });

  test('should allow switching organization from PIN view', async ({ page }) => {
    // First establish organization context
    await page.click('text=Register');
    await page.fill('#orgName', 'Switch Test Org');
    await page.fill('#email', 'switch@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');
    await page.click('button:has-text("Create Account")');

    await page.waitForSelector('#pin-input');

    // Click switch organization
    await page.click('text=Switch Organization');

    // Should return to credentials view
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should navigate to forgot password screen', async ({ page }) => {
    await page.click('text=Forgot Password?');

    // Should navigate to forgot password screen
    await expect(page.locator('text=Forgot Password')).toBeVisible();
  });

  test('should navigate back from registration to login', async ({ page }) => {
    await page.click('text=Register');
    await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();

    await page.click('text=Already have an account? Sign In');

    // Should return to login screen
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should validate required fields in registration', async ({ page }) => {
    await page.click('text=Register');

    // Check that all required fields have the required attribute
    await expect(page.locator('#orgName')).toHaveAttribute('required');
    await expect(page.locator('#email')).toHaveAttribute('required');
    await expect(page.locator('#password')).toHaveAttribute('required');
    await expect(page.locator('#confirmPassword')).toHaveAttribute('required');
  });

  test('should validate email format in registration', async ({ page }) => {
    await page.click('text=Register');

    await page.fill('#orgName', 'Test Organization');
    await page.fill('#email', 'invalid-email-format');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');

    await page.click('button:has-text("Create Account")');

    // HTML5 email validation should prevent submission or show error
    // The form should still be visible (not submitted)
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should handle registration loading state', async ({ page }) => {
    await page.click('text=Register');

    await page.fill('#orgName', 'Loading Test Org');
    await page.fill('#email', 'loading@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#pin', '1234');

    // Click submit and check loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled();

    // Wait for transition to PIN view
    await page.waitForSelector('#pin-input', { timeout: 15000 });
  });
});