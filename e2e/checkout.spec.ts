import { test, expect } from '@playwright/test';

test.describe('E2E Checkout Flow', () => {
  test('adds product to cart, navigates to checkout, completes address & payment forms, and receives confirmation', async ({ page }) => {
    // 1. Visit the shop page
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/shop/);

    // 2. Select a product and click "Add to Wardrobe" (Add to Cart)
    const addToCartBtn = page.getByTestId('add-to-cart-button').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // 3. Navigate to the Cart page via header icon
    const cartLink = page.locator('#desktop-cart-link');
    await expect(cartLink).toBeVisible();
    await cartLink.click();
    await expect(page).toHaveURL(/\/cart/);

    // 4. Verify item in cart and proceed to Checkout
    const proceedCheckoutBtn = page.locator('#proceed-checkout-btn');
    await expect(proceedCheckoutBtn).toBeVisible();
    await proceedCheckoutBtn.click();
    await expect(page).toHaveURL(/\/checkout/);

    // 5. Step 1: Fill in Shipping & Address details
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('client.sartorial@example.com');

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+256 772 123456');

    const districtInput = page.locator('input[placeholder*="Wakiso"]');
    await districtInput.fill('Wakiso');

    const cityInput = page.locator('input[placeholder*="Lubowa"]');
    await cityInput.fill('Lubowa');

    const addressInput = page.locator('input[placeholder*="Plot 42"]');
    await addressInput.fill('Plot 42, Executive Rise, Floor 2');

    // Click Proceed to Payment
    const proceedPaymentBtn = page.locator('button:has-text("Proceed to Payment")');
    await expect(proceedPaymentBtn).toBeVisible();
    await proceedPaymentBtn.click();

    // 6. Step 2: Select Cash on Delivery option
    const codPaymentBtn = page.locator('button:has-text("Cash on Del")').first();
    await expect(codPaymentBtn).toBeVisible();
    await codPaymentBtn.click();

    // Click Complete Order
    const completeOrderBtn = page.locator('button[type="submit"]');
    await expect(completeOrderBtn).toBeVisible();
    await completeOrderBtn.click();

    // 7. Verify Order Confirmation screen
    const confirmationHeader = page.locator('text=Purchase Order Confirmed');
    await expect(confirmationHeader).toBeVisible({ timeout: 15000 });

    const orderSuccessScreen = page.locator('#order-success-screen');
    await expect(orderSuccessScreen).toBeVisible();
  });
});
