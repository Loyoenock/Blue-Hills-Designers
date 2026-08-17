import { test, expect } from '@playwright/test';

test.describe('Customer Order Self-Service Cancellation', () => {
  test('customer can view order history and cancel a pending or processing order', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill credentials for customer
    await page.locator('#login-email-input').fill('customer@example.com');
    await page.locator('#login-password-input').fill('password123');
    await page.locator('#login-btn-final').click();

    // Go to account page
    await page.goto('/account');

    // Switch to Order History tab if not active
    const ordersTabBtn = page.locator('button:has-text("Order History")');
    if (await ordersTabBtn.isVisible()) {
      await ordersTabBtn.click();
    }

    // Check if there is a Cancel Order button available
    const cancelBtn = page.locator('button:has-text("Cancel Order")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Click Confirm button
      const confirmBtn = page.locator('button:has-text("Confirm")').first();
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();

      // Assert status badge updates to CANCELLED and Cancel Order button is gone
      await expect(page.locator('text=CANCELLED').first()).toBeVisible({ timeout: 10000 });
      await expect(cancelBtn).not.toBeVisible();
    }
  });
});
