import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mocks
const mockChargeMobileMoney = vi.fn();
const mockChargeCard = vi.fn();
const mockSendEmail = vi.fn();

vi.mock('@/lib/payment', () => ({
  chargeMobileMoney: (...args: any[]) => mockChargeMobileMoney(...args),
  chargeCard: (...args: any[]) => mockChargeCard(...args),
}));

vi.mock('@/lib/email', () => ({
  sendTransactionalEmail: (...args: any[]) => mockSendEmail(...args),
}));

let mockDbData: {
  app_settings?: any;
  products?: Record<string, any>;
  coupons?: Record<string, any>;
  orders?: Record<string, any>;
  payments?: Record<string, any>;
} = {};

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn().mockImplementation(() => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: (col: string, val: any) => {
          (chain as any)._filters = (chain as any)._filters || [];
          (chain as any)._filters.push({ col, val });
          return chain;
        },
        limit: () => chain,
        maybeSingle: async () => {
          if (table === 'app_settings') {
            return { data: mockDbData.app_settings || null, error: null };
          }
          if (table === 'coupons') {
            const filters = (chain as any)._filters || [];
            const codeFilter = filters.find((f: any) => f.col === 'code')?.val;
            const coupon = mockDbData.coupons?.[codeFilter];
            return { data: coupon || null, error: null };
          }
          if (table === 'orders') {
            const filters = (chain as any)._filters || [];
            const keyFilter = filters.find((f: any) => f.col === 'idempotency_key')?.val;
            const order = mockDbData.orders?.[keyFilter];
            return { data: order || null, error: null };
          }
          if (table === 'payments') {
            const filters = (chain as any)._filters || [];
            const orderIdFilter = filters.find((f: any) => f.col === 'order_id')?.val;
            const payment = mockDbData.payments?.[orderIdFilter];
            return { data: payment || null, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (table === 'products') {
            const filters = (chain as any)._filters || [];
            const idFilter = filters.find((f: any) => f.col === 'id')?.val;
            const product = mockDbData.products?.[idFilter];
            if (!product) return { data: null, error: { message: 'Not found' } };
            return { data: product, error: null };
          }
          return { data: null, error: null };
        },
        insert: () => chain,
        update: () => chain,
      };
      return chain;
    },
  })),
}));

import { POST } from '@/app/api/checkout/route';

describe('POST /api/checkout - Inventory, Coupon & Idempotency Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbData = {
      app_settings: {
        payment_method_mobile_money: true,
        payment_method_visa: true,
        payment_method_cash_on_delivery: true,
        free_shipping_threshold: 2000,
        tax_rate: 18,
      },
      products: {
        'prod-suit-1': {
          id: 'prod-suit-1',
          name: 'Savile Midnight Suit',
          price: 850,
          stock: 2,
          images: ['https://example.com/suit.jpg'],
        },
      },
      coupons: {},
      orders: {},
      payments: {},
    };
  });

  function createCheckoutRequest(body: any): NextRequest {
    return new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  it('rejects checkout with 400 if product stock is insufficient', async () => {
    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 5, // stock is only 2
          selectedSize: '50R',
          selectedColor: 'Navy',
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('insufficient stock');
    expect(data.error).toContain('Available stock is 2');
  });

  it('rejects checkout with 400 for invalid/inactive coupon code', async () => {
    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
          selectedSize: '50R',
          selectedColor: 'Navy',
        },
      ],
      appliedCoupon: { code: 'NONEXISTENT' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('invalid or inactive');
  });

  it('rejects checkout with 400 for expired coupon code', async () => {
    mockDbData.coupons!['EXPIRED20'] = {
      code: 'EXPIRED20',
      is_active: true,
      discount_type: 'percentage',
      discount_value: 20,
      expires_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
      usage_limit: 100,
      times_used: 5,
    };

    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
        },
      ],
      appliedCoupon: { code: 'EXPIRED20' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('has expired');
  });

  it('rejects checkout with 400 when coupon usage limit is exceeded', async () => {
    mockDbData.coupons!['LIMITED10'] = {
      code: 'LIMITED10',
      is_active: true,
      discount_type: 'fixed',
      discount_value: 100,
      expires_at: null,
      usage_limit: 10,
      times_used: 10, // reached limit
    };

    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
        },
      ],
      appliedCoupon: { code: 'LIMITED10' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('reached its usage limit');
  });

  it('short-circuits and returns existing order details when idempotencyKey matches without calling payment', async () => {
    const existingKey = 'idempotent-key-unique-777';
    mockDbData.orders![existingKey] = {
      id: 'ord-uuid-777',
      order_number: 'BHD-777',
      amount: 850,
      status: 'Processing',
      idempotency_key: existingKey,
    };
    mockDbData.payments!['ord-uuid-777'] = {
      id: 'pay-uuid-777',
      order_id: 'ord-uuid-777',
      transaction_id: 'FLW-TXN-PREVIOUS-777',
      status: 'success',
    };

    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Visa',
      paymentDetails: { cardToken: 'flw_tok_123' },
      idempotencyKey: existingKey,
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orderNumber).toBe('BHD-777');
    expect(data.payment.transactionId).toBe('FLW-TXN-PREVIOUS-777');
    expect(data.payment.status).toBe('Paid');

    // Crucial: payment gateway must NOT be charged again
    expect(mockChargeCard).not.toHaveBeenCalled();
    expect(mockChargeMobileMoney).not.toHaveBeenCalled();
  });
});
