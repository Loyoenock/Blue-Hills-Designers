import { test, expect } from '@playwright/test';

test.describe('E2E Admin Console Navigation', () => {
  test.beforeEach(() => {
    test.skip(Boolean(process.env.CI), 'Requires live Supabase instance and seeded Admin credentials in CI environment');
  });

  test('logs in as admin and navigates between Products, Orders, and Settings tabs', async ({ page }) => {
    // 1. Log in with admin credentials
    await page.goto('/login');
    await page.locator('#login-email-input').fill('admin@bluehillsdesigners.com');
    await page.locator('#login-password-input').fill('password123');
    await page.locator('#login-btn-final').click();

    // 2. Navigate to /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    // If redirected to login bypass button, click bypass
    const bypassBtn = page.locator('#bypass-admin-btn');
    if (await bypassBtn.isVisible().catch(() => false)) {
      await bypassBtn.click();
      await page.locator('#login-email-input').fill('admin@bluehillsdesigners.com');
      await page.locator('#login-password-input').fill('password123');
      await page.locator('#login-btn-final').click();
      await page.goto('/admin');
    }

    // Verify Admin Command Core is loaded
    await expect(page.locator('text=BHD Operations Console')).toBeVisible({ timeout: 15000 });

    // 3. Tab 1: Navigate to Products Tab (Apparel Registry)
    const productsTabBtn = page.locator('#admin-tab-products');
    await expect(productsTabBtn).toBeVisible();
    await productsTabBtn.click();

    // Confirm Products tab rendered properly
    await expect(
      page.locator('text=Apparel Registry').or(page.locator('button:has-text("Add New Product")'))
    ).toBeVisible({ timeout: 10000 });

    // 4. Tab 2: Navigate to Orders Tab (Order Ledger)
    const ordersTabBtn = page.locator('#admin-tab-orders');
    await expect(ordersTabBtn).toBeVisible();
    await ordersTabBtn.click();

    // Confirm Orders tab rendered properly
    await expect(
      page.locator('text=Order Ledger').or(page.locator('placeholder*="Search orders"'))
    ).toBeVisible({ timeout: 10000 });

    // 5. Tab 3: Navigate to Settings Tab (Boutique Settings)
    const settingsTabBtn = page.locator('#admin-tab-settings');
    await expect(settingsTabBtn).toBeVisible();
    await settingsTabBtn.click();

    // Confirm Settings tab rendered properly
    await expect(
      page.locator('text=Boutique Settings').or(page.locator('button:has-text("Save Configuration")'))
    ).toBeVisible({ timeout: 10000 });
  });
});
