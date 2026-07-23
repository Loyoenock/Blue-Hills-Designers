import { Coupon } from '@/types';

/**
 * Calculates the discount amount for a given subtotal and coupon.
 */
export function calculateCouponDiscount(subtotal: number, coupon: Coupon): number {
  if (!coupon) return 0;
  if (coupon.discountType === 'percentage') {
    return Math.round(subtotal * (coupon.discountValue / 100));
  } else if (coupon.discountType === 'fixed') {
    return coupon.discountValue;
  }
  return 0;
}
