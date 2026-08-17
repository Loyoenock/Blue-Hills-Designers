import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStore } from '../store/useStore';
import { POST as flutterwaveWebhookHandler } from '../app/api/webhooks/flutterwave/route';
import { NextRequest } from 'next/server';
import * as supabaseLib from '../lib/supabase';

const PROD_ID = '11111111-1111-4111-8111-111111111111';
const ORD_ID = '22222222-2222-4222-8222-222222222222';
const PAY_ID = '33333333-3333-4333-8333-333333333333';

describe('Stock Restoration on Order Cancellation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PAYMENT_TEST_MODE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Mock global fetch for safeSupabaseUpsert calls to /api/db
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));

    // Reset store state with valid UUIDs
    useStore.setState({
      products: [
        {
          id: PROD_ID,
          name: 'Classic Bespoke Suit',
          price: 2500,
          stock: 8,
          category: 'Suits',
          description: 'Tailored luxury suit',
          images: ['https://example.com/suit.jpg'],
          sizes: ['48R', '50R', '52R'],
          colors: ['Navy'],
          isFeatured: true,
          rating: 5,
          reviews: [],
        }
      ],
      orders: [
        {
          id: ORD_ID,
          orderNumber: 'ORD-100',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '256700000000',
          amount: 5000,
          status: 'Pending',
          date: new Date().toISOString(),
          paymentMethod: 'Mobile Money',
          items: [
            {
              productId: PROD_ID,
              productName: 'Classic Bespoke Suit',
              price: 2500,
              quantity: 2,
              selectedSize: 'L',
              selectedColor: 'Navy',
              image: 'https://example.com/suit.jpg',
            }
          ],
          shippingAddress: {
            country: 'Uganda',
            district: 'Kampala',
            city: 'Kampala',
            address: 'Plot 123 Main St',
          }
        }
      ],
      payments: [
        {
          id: PAY_ID,
          orderId: ORD_ID,
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          amount: 5000,
          paymentMethod: 'Mobile Money',
          status: 'Pending',
          date: new Date().toISOString(),
          transactionId: 'FLW-TXN-100',
        }
      ],
      auditLogs: [],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('restores stock when updateOrderStatus transitions order to Cancelled', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: rpcMock,
    };
    vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const initialStock = useStore.getState().products.find(p => p.id === PROD_ID)?.stock;
    expect(initialStock).toBe(8);

    const result = await useStore.getState().updateOrderStatus(ORD_ID, 'Cancelled', 'Admin User', 'Admin');

    expect(result.success).toBe(true);

    // Stock should be incremented from 8 to 10
    const updatedStock = useStore.getState().products.find(p => p.id === PROD_ID)?.stock;
    expect(updatedStock).toBe(10);

    // RPC release_product_stock should be called with p_quantity = 2
    expect(rpcMock).toHaveBeenCalledWith('release_product_stock', expect.objectContaining({
      p_quantity: 2,
    }));
  });

  it('does not double-release stock if order is already Cancelled', async () => {
    // Set order status to Cancelled first
    useStore.setState(state => ({
      orders: state.orders.map(o => o.id === ORD_ID ? { ...o, status: 'Cancelled' as const } : o)
    }));

    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: rpcMock,
    };
    vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const initialStock = useStore.getState().products.find(p => p.id === PROD_ID)?.stock;

    const result = await useStore.getState().updateOrderStatus(ORD_ID, 'Cancelled', 'Admin User', 'Admin');

    expect(result.success).toBe(true);
    expect(useStore.getState().products.find(p => p.id === PROD_ID)?.stock).toBe(initialStock);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('restores stock when updatePaymentStatus marks payment as Failed and cascades order to Cancelled', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: rpcMock,
    };
    vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const initialStock = useStore.getState().products.find(p => p.id === PROD_ID)?.stock;
    expect(initialStock).toBe(8);

    const result = await useStore.getState().updatePaymentStatus(PAY_ID, 'Failed', 'Admin User', 'Admin');

    expect(result.success).toBe(true);

    // Order status should now be Cancelled
    const updatedOrder = useStore.getState().orders.find(o => o.id === ORD_ID);
    expect(updatedOrder?.status).toBe('Cancelled');

    // Stock should be restored (8 -> 10)
    const updatedStock = useStore.getState().products.find(p => p.id === PROD_ID)?.stock;
    expect(updatedStock).toBe(10);

    expect(rpcMock).toHaveBeenCalledWith('release_product_stock', expect.objectContaining({
      p_quantity: 2,
    }));
  });

  it('restores stock during Flutterwave webhook failed payment for a pending order', async () => {
    const mockPaymentRecord = {
      id: PAY_ID,
      order_id: ORD_ID,
      transaction_id: 'FLW-TXN-100',
      status: 'pending',
    };

    const mockOrderItems = [
      { product_id: PROD_ID, quantity: 2 }
    ];

    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPaymentRecord, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: ORD_ID, status: 'pending' }, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockOrderItems, error: null }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: auditInsertMock,
          };
        }
        return {};
      }),
      rpc: rpcMock,
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.completed',
        data: {
          tx_ref: 'FLW-TXN-100',
          flw_ref: 'FLW-100',
          status: 'failed',
        },
      }),
    });

    const res = await flutterwaveWebhookHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(rpcMock).toHaveBeenCalledWith('release_product_stock', expect.objectContaining({
      p_product_id: PROD_ID,
      p_quantity: 2,
    }));
    expect(auditInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Webhook Payment Update',
      details: expect.stringContaining('released reserved stock'),
    }));
  });
});
