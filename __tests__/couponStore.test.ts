import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { VALID_COUPONS } from '@/lib/coupons';

describe('useStore - applyCoupon Smoke Test', () => {
  beforeEach(() => {
    // Reset store coupon state before each test
    useStore.getState().removeCoupon();
  });

  it('successfully applies WELCOME10 coupon code and updates store state', () => {
    const result = useStore.getState().applyCoupon('WELCOME10');
    expect(result.success).toBe(true);
    expect(result.message).toContain('WELCOME10');

    const applied = useStore.getState().appliedCoupon;
    expect(applied).not.toBeNull();
    expect(applied?.code).toBe('WELCOME10');
    expect(applied?.discountType).toBe('percentage');
    expect(applied?.discountValue).toBe(10);
  });

  it('successfully applies GENTLEMAN20 coupon code', () => {
    const result = useStore.getState().applyCoupon('GENTLEMAN20');
    expect(result.success).toBe(true);

    const applied = useStore.getState().appliedCoupon;
    expect(applied?.code).toBe('GENTLEMAN20');
    expect(applied?.discountValue).toBe(20);
  });

  it('successfully applies SAVILEROW50 fixed discount coupon code', () => {
    const result = useStore.getState().applyCoupon('SAVILEROW50');
    expect(result.success).toBe(true);

    const applied = useStore.getState().appliedCoupon;
    expect(applied?.code).toBe('SAVILEROW50');
    expect(applied?.discountType).toBe('fixed');
    expect(applied?.discountValue).toBe(50);
  });

  it('successfully applies KAMPALA30 coupon code (case-insensitive & handles leading/trailing whitespace)', () => {
    const result = useStore.getState().applyCoupon('  kampala30  ');
    expect(result.success).toBe(true);

    const applied = useStore.getState().appliedCoupon;
    expect(applied?.code).toBe('KAMPALA30');
    expect(applied?.discountValue).toBe(30);
  });

  it('returns failure for invalid coupon code and leaves store appliedCoupon unchanged', () => {
    const result = useStore.getState().applyCoupon('INVALID_EXPIRED_CODE');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid luxury coupon code.');

    const applied = useStore.getState().appliedCoupon;
    expect(applied).toBeNull();
  });

  it('removeCoupon clears the applied coupon from store', () => {
    useStore.getState().applyCoupon('WELCOME10');
    expect(useStore.getState().appliedCoupon).not.toBeNull();

    useStore.getState().removeCoupon();
    expect(useStore.getState().appliedCoupon).toBeNull();
  });
});
