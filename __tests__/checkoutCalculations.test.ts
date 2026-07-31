import { describe, it, expect } from 'vitest';
import { VALID_COUPONS } from '@/lib/coupons';

function calculateCheckoutInvoice(
  cart: { price: number; quantity: number }[],
  couponCode?: string,
  shippingMethod: 'standard' | 'express' | 'pickup' = 'standard',
  courierFees = { standard: 50, express: 120, pickup: 0 }
) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let couponDiscount = 0;
  if (couponCode) {
    const sanitizedCode = couponCode.trim().toUpperCase();
    const coupon = VALID_COUPONS.find((c) => c.code === sanitizedCode);
    if (coupon) {
      if (coupon.discountType === 'percentage') {
        couponDiscount = Math.round(subtotal * (coupon.discountValue / 100));
      } else if (coupon.discountType === 'fixed') {
        couponDiscount = coupon.discountValue;
      }
    }
  }

  let deliveryFee = 0;
  if (shippingMethod === 'standard') {
    const threshold = 2000;
    deliveryFee = subtotal > threshold ? 0 : courierFees.standard;
  } else if (shippingMethod === 'express') {
    deliveryFee = courierFees.express;
  } else if (shippingMethod === 'pickup') {
    deliveryFee = courierFees.pickup;
  }

  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);
  const taxRate = 18;
  const taxableAmount = subtotal - couponDiscount;
  const taxAmount = Math.round((taxableAmount / (1 + taxRate / 100)) * (taxRate / 100));

  return {
    subtotal,
    couponDiscount,
    deliveryFee,
    taxAmount,
    total,
  };
}

describe('Checkout Calculations Logic', () => {
  it('calculates cart subtotal correctly for multiple items', () => {
    const cart = [
      { price: 150, quantity: 2 }, // 300
      { price: 450, quantity: 1 }, // 450
    ];
    const invoice = calculateCheckoutInvoice(cart, undefined, 'pickup');
    expect(invoice.subtotal).toBe(750);
    expect(invoice.couponDiscount).toBe(0);
    expect(invoice.deliveryFee).toBe(0);
    expect(invoice.total).toBe(750);
  });

  describe('Coupon Calculations', () => {
    const cart = [{ price: 1000, quantity: 1 }]; // subtotal = 1000

    it('applies percentage coupon WELCOME10 (10%)', () => {
      const invoice = calculateCheckoutInvoice(cart, 'WELCOME10', 'pickup');
      expect(invoice.couponDiscount).toBe(100);
      expect(invoice.total).toBe(900);
    });

    it('applies percentage coupon GENTLEMAN20 (20%)', () => {
      const invoice = calculateCheckoutInvoice(cart, 'gentleman20', 'pickup'); // lowercase code check
      expect(invoice.couponDiscount).toBe(200);
      expect(invoice.total).toBe(800);
    });

    it('applies percentage coupon KAMPALA30 (30%)', () => {
      const invoice = calculateCheckoutInvoice(cart, 'KAMPALA30', 'pickup');
      expect(invoice.couponDiscount).toBe(300);
      expect(invoice.total).toBe(700);
    });

    it('applies fixed coupon SAVILEROW50 (50 off)', () => {
      const invoice = calculateCheckoutInvoice(cart, 'SAVILEROW50', 'pickup');
      expect(invoice.couponDiscount).toBe(50);
      expect(invoice.total).toBe(950);
    });

    it('ignores invalid or unknown coupon codes', () => {
      const invoice = calculateCheckoutInvoice(cart, 'INVALID_CODE', 'pickup');
      expect(invoice.couponDiscount).toBe(0);
      expect(invoice.total).toBe(1000);
    });
  });

  describe('Shipping Method Tiers', () => {
    it('applies 50 standard shipping fee when subtotal <= 2000', () => {
      const cart = [{ price: 1000, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, undefined, 'standard');
      expect(invoice.deliveryFee).toBe(50);
      expect(invoice.total).toBe(1050);
    });

    it('waives standard shipping fee (0 delivery fee) when subtotal > 2000', () => {
      const cart = [{ price: 2500, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, undefined, 'standard');
      expect(invoice.deliveryFee).toBe(0);
      expect(invoice.total).toBe(2500);
    });

    it('applies express shipping fee of 120 regardless of subtotal', () => {
      const cart = [{ price: 3000, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, undefined, 'express');
      expect(invoice.deliveryFee).toBe(120);
      expect(invoice.total).toBe(3120);
    });

    it('applies 0 shipping fee for store pickup', () => {
      const cart = [{ price: 500, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, undefined, 'pickup');
      expect(invoice.deliveryFee).toBe(0);
      expect(invoice.total).toBe(500);
    });
  });

  describe('VAT Tax Calculation', () => {
    it('calculates 18% VAT included in taxable amount', () => {
      // subtotal = 1000, no discount -> taxableAmount = 1000
      // tax = Math.round((1000 / 1.18) * 0.18) = Math.round(152.542...) = 153
      const cart = [{ price: 1000, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, undefined, 'pickup');
      expect(invoice.taxAmount).toBe(153);
    });

    it('re-calculates VAT on post-discount taxable amount', () => {
      // subtotal = 1000, discount = 200 -> taxableAmount = 800
      // tax = Math.round((800 / 1.18) * 0.18) = Math.round(122.033...) = 122
      const cart = [{ price: 1000, quantity: 1 }];
      const invoice = calculateCheckoutInvoice(cart, 'GENTLEMAN20', 'pickup');
      expect(invoice.taxAmount).toBe(122);
    });
  });

  describe('Boundary Condition', () => {
    it('ensures total never drops below 0 even if discount exceeds subtotal', () => {
      const cart = [{ price: 30, quantity: 1 }]; // subtotal = 30
      // SAVILEROW50 gives 50 off
      const invoice = calculateCheckoutInvoice(cart, 'SAVILEROW50', 'pickup');
      expect(invoice.couponDiscount).toBe(50);
      expect(invoice.total).toBe(0);
    });
  });
});
