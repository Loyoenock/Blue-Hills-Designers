import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  rpcError?: any;
} = {};

const mockRpc = vi.fn().mockImplementation((fnName: string, params: any) => {
  if (mockDbData.rpcError) {
    return Promise.resolve({ data: null, error: mockDbData.rpcError });
  }
  return Promise.resolve({ data: null, error: null });
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: vi.fn().mockImplementation((token: string) => {
        if (!token || token === 'invalid-token') {
          return Promise.resolve({ data: { user: null }, error: { message: 'Invalid token' } });
        }
        return Promise.resolve({
          data: {
            user: {
              id: '123e4567-e89b-42d3-a456-426614174000',
              email: 'buyer@example.com',
              user_metadata: { role: 'Customer' },
            },
          },
          error: null,
        });
      }),
    },
    rpc: (fnName: string, params: any) => mockRpc(fnName, params),
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
      rpcError: null,
    };
  });

  function createCheckoutRequest(body: any, token: string | null = 'valid-jwt-token'): NextRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  it('rejects unauthenticated checkout with 401 when no token is provided and performs no payment charges or order writes', async () => {
    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Mobile Money',
      paymentDetails: { momoProvider: 'MTN', momoNumber: '+256770000000' },
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
        },
      ],
    }, null); // null token -> no auth header or cookie

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/Authentication token is missing, invalid, or expired/i);
    expect(mockChargeMobileMoney).not.toHaveBeenCalled();
    expect(mockChargeCard).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

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

  it('surfaces 400 inventory message when create_checkout_order RPC fails due to concurrent reservation (insufficient stock)', async () => {
    mockDbData.rpcError = { message: 'Insufficient stock for product prod-suit-1' };

    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'cart-1',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 2, // stock in cache is 2, so pre-check passes
          selectedSize: '50R',
          selectedColor: 'Navy',
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('became out of stock during checkout');
    expect(mockRpc).toHaveBeenCalledWith('create_checkout_order', expect.any(Object));
  });

  it('handles generic DB error from create_checkout_order RPC without leaving partial orders or executing absolute stock writes', async () => {
    mockDbData.rpcError = { message: 'Deadlock detected during atomic transaction' };

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
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Checkout DB failure');
    expect(mockRpc).toHaveBeenCalledWith('create_checkout_order', expect.any(Object));
  });

  it('documents and asserts that absolute stock update write and redundant coupon update writes are prohibited in route code', () => {
    const routeFilePath = path.join(process.cwd(), 'app/api/checkout/route.ts');
    const routeCode = fs.readFileSync(routeFilePath, 'utf8');

    // Regression protection: Absolute stock updates must not exist in route code
    expect(routeCode).not.toMatch(/\.from\(['"]products['"]\)\s*\.update\(/i);
    // Regression protection: Redundant manual coupon times_used updates must not exist in route code
    expect(routeCode).not.toMatch(/\.from\(['"]coupons['"]\)\s*\.update\(/i);
    // Must execute atomic RPC checkout transaction
    expect(routeCode).toContain('create_checkout_order');
  });

  it('surfaces 400 coupon limit message when create_checkout_order RPC fails due to atomic coupon usage limit reached', async () => {
    mockDbData.coupons!['RACE_LIMIT'] = {
      id: 'coupon-uuid-1',
      code: 'RACE_LIMIT',
      is_active: true,
      discount_type: 'fixed',
      discount_value: 50,
      usage_limit: 1,
      times_used: 0, // Passed initial pre-check
    };
    mockDbData.rpcError = { message: 'Coupon usage limit reached' };

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
      appliedCoupon: { code: 'RACE_LIMIT' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('reached its usage limit');
    expect(mockRpc).toHaveBeenCalledWith('create_checkout_order', expect.any(Object));
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

  it('rejects checkout with 400 if combined quantity of multiple line items for the same product exceeds available stock', async () => {
    // Product stock is 2. Cart has 2 line items for same product: 1 of size M, 2 of size L (total 3 requested)
    const req = createCheckoutRequest({
      email: 'buyer@example.com',
      phone: '+256770000000',
      paymentMethod: 'Cash on Delivery',
      shippingAddress: { city: 'Kampala', address: 'Plot 10 Kampala Rd' },
      cart: [
        {
          id: 'prod-suit-1-M-Navy',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 1,
          selectedSize: 'M',
          selectedColor: 'Navy',
        },
        {
          id: 'prod-suit-1-L-Navy',
          product: { id: 'prod-suit-1', name: 'Savile Midnight Suit' },
          quantity: 2,
          selectedSize: 'L',
          selectedColor: 'Navy',
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('insufficient stock');
    expect(data.error).toContain('Available stock is 2');
    expect(data.error).toContain('requested 3');
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
