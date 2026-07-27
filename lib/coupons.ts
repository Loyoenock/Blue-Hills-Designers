import { Coupon } from '@/types';

/**
 * Mirror of default DB-seeded luxury coupons for unit testing and offline calculation fixtures.
 * Note: Must be kept in sync with supabase_schema.sql's seed data if coupons change.
 */
export const VALID_COUPONS: Coupon[] = [
  {
    id: '1',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
  },
  {
    id: '2',
    code: 'GENTLEMAN20',
    discountType: 'percentage',
    discountValue: 20,
    isActive: true,
  },
  {
    id: '3',
    code: 'SAVILEROW50',
    discountType: 'fixed',
    discountValue: 50,
    isActive: true,
  },
  {
    id: '4',
    code: 'KAMPALA30',
    discountType: 'percentage',
    discountValue: 30,
    isActive: true,
  },
];

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
