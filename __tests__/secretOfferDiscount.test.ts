import { describe, it, expect } from 'vitest';
import { getEffectivePrice } from '../lib/utils';

describe('Secret Offer Deal Discount Calculation', () => {
  it('returns raw price for standard products without a deal', () => {
    const product = {
      price: 1250,
      isDealOfTheDay: false,
      discountPercentage: 20,
    };
    expect(getEffectivePrice(product)).toBe(1250);
  });

  it('calculates discounted price (Math.floor) when deal is active and not expired', () => {
    const product = {
      price: 1250,
      isDealOfTheDay: true,
      discountPercentage: 20,
      dealExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(getEffectivePrice(product)).toBe(1000);
  });

  it('calculates discounted price when dealExpiresAt is null (indefinite deal)', () => {
    const product = {
      price: 1000,
      is_deal: true,
      discount_percentage: 15,
      deal_expires_at: null,
    };
    expect(getEffectivePrice(product)).toBe(850);
  });

  it('reverts to full price when deal is expired', () => {
    const product = {
      price: 1250,
      isDealOfTheDay: true,
      discountPercentage: 20,
      dealExpiresAt: new Date(Date.now() - 3600000).toISOString(),
    };
    expect(getEffectivePrice(product)).toBe(1250);
  });

  it('returns raw price if discountPercentage is 0', () => {
    const product = {
      price: 1250,
      isDealOfTheDay: true,
      discountPercentage: 0,
    };
    expect(getEffectivePrice(product)).toBe(1250);
  });
});
