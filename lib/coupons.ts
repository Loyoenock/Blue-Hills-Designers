import { Coupon } from '@/types';

// Standard Kampala luxury coupons
export const VALID_COUPONS: Coupon[] = [
  { code: 'WELCOME10', discountType: 'percentage', discountValue: 10 },
  { code: 'GENTLEMAN20', discountType: 'percentage', discountValue: 20 },
  { code: 'SAVILEROW50', discountType: 'fixed', discountValue: 50 },
  { code: 'KAMPALA30', discountType: 'percentage', discountValue: 30 },
];
