import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/orders/route';
import { PATCH, DELETE } from '@/app/api/admin/orders/[id]/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';
import { toDbOrderStatus, toUiOrderStatus } from '@/lib/orderStatus';
import { isUUID } from '@/lib/utils';
import { useStore } from '@/store/useStore';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({ id: 'caller-admin-uuid', role: 'Super Admin' }),
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

const VALID_TEST_ORDER_UUID = 'a0000000-0000-4000-a000-000000000001';

describe('BHD Orders Ledger Admin CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Order Status Domain Mapping (lib/orderStatus.ts)', () => {
    it('maps UI status to DB status correctly', () => {
      expect(toDbOrderStatus('Delivered')).toBe('completed');
      expect(toDbOrderStatus('completed')).toBe('completed');
      expect(toDbOrderStatus('Processing')).toBe('processing');
      expect(toDbOrderStatus('Cancelled')).toBe('cancelled');
      expect(toDbOrderStatus('Pending')).toBe('pending');
      expect(toDbOrderStatus('unknown' as any)).toBe('pending');
      expect(toDbOrderStatus(undefined)).toBe('pending');
    });

    it('maps DB status to UI status correctly', () => {
      expect(toUiOrderStatus('completed')).toBe('Delivered');
      expect(toUiOrderStatus('Delivered')).toBe('Delivered');
      expect(toUiOrderStatus('processing')).toBe('Processing');
      expect(toUiOrderStatus('cancelled')).toBe('Cancelled');
      expect(toUiOrderStatus('pending')).toBe('Pending');
      expect(toUiOrderStatus('unknown' as any)).toBe('Pending');
      expect(toUiOrderStatus(undefined)).toBe('Pending');
    });
  });

  describe('2. POST /api/admin/orders (Order Creation)', () => {
    it('creates an order, items, address, and payment record atomically', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({
        id: 'admin-uuid',
        role: 'Super Admin',
      } as any);

      let insertedOrder: any = null;
      let insertedItems: any = null;
      let insertedAddress: any = null;
      let insertedPayment: any = null;

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'orders') {
            return {
              insert: vi.fn().mockImplementation((data: any) => {
                insertedOrder = data;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: data.id,
                        order_number: data.order_number,
                        amount: data.amount,
                        status: data.status,
                        payment_method: data.payment_method,
                        notes: data.notes,
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }
          if (table === 'order_items') {
            return {
              insert: vi.fn().mockImplementation((data: any) => {
                insertedItems = data;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'order_addresses') {
            return {
              insert: vi.fn().mockImplementation((data: any) => {
                insertedAddress = data;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockImplementation((data: any) => {
                insertedPayment = data;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabase as any);

      const payload = {
        customerName: 'Lord Alistair',
        customerEmail: 'alistair@boutique.com',
        customerPhone: '+256 700 111 222',
        shippingAddress: {
          country: 'Uganda',
          district: 'Kampala',
          city: 'Kampala',
          address: 'Kololo Terrace 5',
        },
        paymentMethod: 'Cash on Delivery',
        status: 'Pending',
        notes: 'Test VIP fitting',
        items: [
          {
            productName: 'Double-Breasted Tuxedo',
            price: 700000,
            quantity: 1,
            selectedSize: '50R',
            selectedColor: 'Midnight Navy',
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.order).toBeDefined();
      expect(isUUID(json.order.id)).toBe(true);
      expect(json.order.status).toBe('Pending');
      expect(insertedOrder.amount).toBe(700000);
      expect(insertedItems.length).toBe(1);
      expect(insertedAddress.address).toBe('Kololo Terrace 5');
      expect(insertedPayment.payment_method).toBe('Cash on Delivery');
    });

    it('rejects creation if user has insufficient role (e.g. Staff)', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({
        id: 'staff-uuid',
        role: 'Staff',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          shippingAddress: { address: 'Addr', country: 'Uganda', district: 'Kampala', city: 'Kampala' },
          items: [{ productName: 'Suit', price: 100, quantity: 1 }],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain('Forbidden');
    });
  });

  describe('3. PATCH /api/admin/orders/[id] (Order Modification)', () => {
    it('updates order details, address, and line items', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({
        id: 'admin-uuid',
        role: 'Admin',
      } as any);

      let updatedOrderData: any = null;
      let upsertedAddressData: any = null;

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: VALID_TEST_ORDER_UUID,
                      order_number: 'BHD-9901',
                      amount: 700000,
                      status: 'pending',
                      payment_method: 'Cash on Delivery',
                      notes: 'Initial fitting',
                      order_addresses: [{ address: 'Original Suite', city: 'Kampala', district: 'Kampala', country: 'Uganda' }],
                      order_items: [],
                      payments: [],
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((data: any) => {
                updatedOrderData = data;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          if (table === 'order_addresses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'addr-uuid-1' },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((data: any) => {
                upsertedAddressData = data;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
              insert: vi.fn().mockImplementation((data: any) => {
                upsertedAddressData = data;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'payments') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                  neq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabase as any);

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${VALID_TEST_ORDER_UUID}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Delivered',
          notes: 'Delivered to concierge',
          shippingAddress: {
            address: 'New Residence Suite 10',
          },
        }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: VALID_TEST_ORDER_UUID }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(updatedOrderData.status).toBe('completed');
      expect(updatedOrderData.notes).toBe('Delivered to concierge');
      expect(upsertedAddressData.address).toBe('New Residence Suite 10');
    });
  });

  describe('4. DELETE /api/admin/orders/[id] (Order Hard Deletion)', () => {
    it('deletes order and cascades in Supabase', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({
        id: 'admin-uuid',
        role: 'Super Admin',
      } as any);

      let deletedOrderId: string | null = null;

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'orders') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  deletedOrderId = val;
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabase as any);

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${VALID_TEST_ORDER_UUID}`, {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ id: VALID_TEST_ORDER_UUID }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(deletedOrderId).toBe(VALID_TEST_ORDER_UUID);
    });

    it('rejects deletion for Manager or Staff role', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({
        id: 'manager-uuid',
        role: 'Manager',
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${VALID_TEST_ORDER_UUID}`, {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ id: VALID_TEST_ORDER_UUID }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain('Forbidden');
    });
  });

  describe('5. Zustand Store Order Actions', () => {
    it('adminDeleteOrder rejects non-UUID demo seed orders', async () => {
      const store = useStore.getState();
      const res = await store.adminDeleteOrder('demo-seed-123', 'Admin Master', 'Super Admin');
      expect(res.success).toBe(false);
      expect(res.error).toContain('demo/seed record');
    });

    it('adminUpdateOrder rejects non-UUID demo seed orders', async () => {
      const store = useStore.getState();
      const res = await store.adminUpdateOrder('demo-seed-123', { status: 'Delivered' }, 'Admin Master', 'Super Admin');
      expect(res.success).toBe(false);
      expect(res.error).toContain('demo/seed record');
    });
  });
});
