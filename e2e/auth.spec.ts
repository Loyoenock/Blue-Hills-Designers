import { test, expect } from '@playwright/test';

test.describe('E2E Auth Flows', () => {
  test('Login happy path: signs in with authorized executive credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Fill credentials
    await page.locator('#login-email-input').fill('admin@bluehillsdesigners.com');
    await page.locator('#login-password-input').fill('password123');

    // Submit form
    await page.locator('#login-btn-final').click();

    // Verify success banner or redirection
    await expect(
      page.locator('text=Keys confirmed').or(page.locator('text=Executive Account Core')).or(page.locator('text=Master Admin'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Register happy path: creates a new client account profile', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);

    const testEmail = `executive_${Date.now()}@example.com`;

    await page.locator('#reg-name-input').fill('Julius Ssebaana');
    await page.locator('#reg-email-input').fill(testEmail);
    await page.locator('#reg-phone-input').fill('+256 772 999888');
    await page.locator('#reg-password-input').fill('SecurePass123!');

    // Check agreement
    await page.locator('input[type="checkbox"]').check();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Verify success notification or redirection
    await expect(
      page.locator('text=Registry compiled successfully').or(page.locator('text=Executive Access')).or(page.locator('text=Sign In'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Forgot Password happy path: dispatches recovery link for email', async ({ page }) => {
    await page.goto('/login');

    // Click Forgot Password link
    const forgotBtn = page.locator('button:has-text("Forgot Password?")');
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // Fill email
    await page.locator('#login-email-input').fill('executive@corporate.com');

    // Click Transmit Recovery Link button
    await page.locator('#login-btn-final').click();

    // Verify transmission success banner
    await expect(page.locator('text=Transmission Successful!')).toBeVisible({ timeout: 10000 });
  });

  test('Reset Password happy path: updates credentials with new security key', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/reset-password/);

    await page.locator('#reset-new-password').fill('NewStrongPassword123!');
    await page.locator('#reset-confirm-password').fill('NewStrongPassword123!');

    await page.locator('button[type="submit"]').click();

    // Verify credentials saved banner
    await expect(page.locator('text=Credentials Saved!')).toBeVisible({ timeout: 10000 });
  });
});
