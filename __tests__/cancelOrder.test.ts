import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStore } from '../store/useStore';

describe('cancelOrder - Store logic and stock release', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('cancelOrder rolls back optimistic state and releases no stock if the API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Access Denied: Table "orders" is not authorized for operations.' })
    }));

    useStore.setState({
      currentUser: {
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'Jane Customer',
        email: 'jane@example.com',
        role: 'Customer',
        spending: 0,
        rewardsPoints: 0,
      },
      products: [
        {
          id: 'prod-1',
          name: 'Silk Dress',
          description: 'A fine dress',
          category: 'Dresses',
          price: 100000,
          images: [],
          sizes: ['M'],
          colors: ['Red'],
          stock: 5,
          rating: 5,
          reviews: []
        }
      ],
      orders: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ORD-101',
          customerName: 'Jane Customer',
          customerEmail: 'jane@example.com',
          customerPhone: '123456789',
          amount: 100000,
          status: 'Pending',
          date: '2026-08-12',
          items: [
            {
              productId: 'prod-1',
              productName: 'Silk Dress',
              price: 100000,
              quantity: 2,
              selectedSize: 'M',
              selectedColor: 'Red',
              image: '/image.jpg'
            }
          ],
          shippingAddress: { country: 'Uganda', district: 'Kampala', city: 'Kampala', address: 'Main St' },
          paymentMethod: 'Cash on Delivery'
        }
      ]
    });

    const result = await useStore.getState().cancelOrder('11111111-1111-4111-8111-111111111111');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Access Denied');

    // State should be rolled back to Pending
    const orderInStore = useStore.getState().orders.find(o => o.id === '11111111-1111-4111-8111-111111111111');
    expect(orderInStore?.status).toBe('Pending');

    // Product stock should remain unchanged (5)
    const productInStore = useStore.getState().products.find(p => p.id === 'prod-1');
    expect(productInStore?.stock).toBe(5);
  });

  it('cancelOrder succeeds for the owning customer on a Pending order and triggers releaseOrderStock', async () => {
    useStore.setState({
      currentUser: {
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'Jane Customer',
        email: 'jane@example.com',
        role: 'Customer',
        spending: 0,
        rewardsPoints: 0,
      },
      products: [
        {
          id: 'prod-1',
          name: 'Silk Dress',
          description: 'A fine dress',
          category: 'Dresses',
          price: 100000,
          images: [],
          sizes: ['M'],
          colors: ['Red'],
          stock: 5,
          rating: 5,
          reviews: []
        }
      ],
      orders: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ORD-101',
          customerName: 'Jane Customer',
          customerEmail: 'jane@example.com',
          customerPhone: '123456789',
          amount: 100000,
          status: 'Pending',
          date: '2026-08-12',
          items: [
            {
              productId: 'prod-1',
              productName: 'Silk Dress',
              price: 100000,
              quantity: 2,
              selectedSize: 'M',
              selectedColor: 'Red',
              image: '/image.jpg'
            }
          ],
          shippingAddress: { country: 'Uganda', district: 'Kampala', city: 'Kampala', address: 'Main St' },
          paymentMethod: 'Cash on Delivery'
        }
      ]
    });

    const result = await useStore.getState().cancelOrder('11111111-1111-4111-8111-111111111111');

    expect(result.success).toBe(true);

    const orderInStore = useStore.getState().orders.find(o => o.id === '11111111-1111-4111-8111-111111111111');
    expect(orderInStore?.status).toBe('Cancelled');

    // Stock was 5, 2 items were reserved, so releaseOrderStock increases stock to 7
    const productInStore = useStore.getState().products.find(p => p.id === 'prod-1');
    expect(productInStore?.stock).toBe(7);
  });

  it('cancelOrder refuses to run for a Delivered order without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    useStore.setState({
      currentUser: {
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'Jane Customer',
        email: 'jane@example.com',
        role: 'Customer',
        spending: 0,
        rewardsPoints: 0,
      },
      orders: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ORD-101',
          customerName: 'Jane Customer',
          customerEmail: 'jane@example.com',
          customerPhone: '123456789',
          amount: 100000,
          status: 'Delivered',
          date: '2026-08-12',
          items: [],
          shippingAddress: { country: 'Uganda', district: 'Kampala', city: 'Kampala', address: 'Main St' },
          paymentMethod: 'Cash on Delivery'
        }
      ]
    });

    const result = await useStore.getState().cancelOrder('11111111-1111-4111-8111-111111111111');

    expect(result.success).toBe(false);
    expect(result.error).toContain('This order can no longer be cancelled');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
