import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useRealtimeSync,
  registerChannelCallback,
  unregisterChannelCallback,
  __getRealtimeChannelRegistry,
  __resetRealtimeChannelRegistry
} from '@/hooks/useRealtimeSync';
import { useStore } from '@/store/useStore';
import * as supabaseModule from '@/lib/supabase';

describe('useRealtimeSync Hook Module', () => {
  it('exports useRealtimeSync function correctly', () => {
    expect(typeof useRealtimeSync).toBe('function');
  });

  describe('Realtime Channel Singleton & Multi-Subscriber Registry', () => {
    let mockChannelInstance: any;
    let mockSupabase: any;
    let registeredPostgresHandler: ((payload: any) => void) | null = null;
    let onCallCount = 0;
    let subscribeCallCount = 0;
    let removeChannelCallCount = 0;

    beforeEach(() => {
      __resetRealtimeChannelRegistry();
      onCallCount = 0;
      subscribeCallCount = 0;
      removeChannelCallCount = 0;
      registeredPostgresHandler = null;

      mockChannelInstance = {
        name: 'orders-changes',
        on: vi.fn((event: string, filter: any, handler: (payload: any) => void) => {
          onCallCount++;
          registeredPostgresHandler = handler;
          return mockChannelInstance;
        }),
        subscribe: vi.fn((statusCallback: (status: string) => void) => {
          subscribeCallCount++;
          if (statusCallback) statusCallback('SUBSCRIBED');
          return mockChannelInstance;
        }),
      };

      mockSupabase = {
        channel: vi.fn((name: string) => mockChannelInstance),
        removeChannel: vi.fn((ch: any) => {
          removeChannelCallCount++;
        }),
      };

      vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase);
    });

    it('(a) two sequential calls with the same channel name only create and subscribe the channel once', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      const config = {
        channelName: 'orders-changes',
        table: 'orders',
        logLabel: 'Orders',
        changeMsg: 'Order changed',
        statusMsg: 'Status changed',
      };

      // First subscriber (e.g. Header)
      const unsub1 = registerChannelCallback(config, cb1);

      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
      expect(mockChannelInstance.on).toHaveBeenCalledTimes(1);
      expect(mockChannelInstance.subscribe).toHaveBeenCalledTimes(1);

      // Second subscriber (e.g. AdminPanel)
      const unsub2 = registerChannelCallback(config, cb2);

      // Channel, .on, and .subscribe should NOT be called again
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
      expect(mockChannelInstance.on).toHaveBeenCalledTimes(1);
      expect(mockChannelInstance.subscribe).toHaveBeenCalledTimes(1);

      const registry = __getRealtimeChannelRegistry();
      expect(registry.has('orders-changes')).toBe(true);
      expect(registry.get('orders-changes')?.callbacks.size).toBe(2);

      unsub1();
      unsub2();
    });

    it('(b) adding a second subscriber only registers an extra callback and fans out payloads without re-calling .on()', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      const config = {
        channelName: 'orders-changes',
        table: 'orders',
        logLabel: 'Orders',
        changeMsg: 'Order changed',
        statusMsg: 'Status changed',
      };

      const unsub1 = registerChannelCallback(config, cb1);
      const unsub2 = registerChannelCallback(config, cb2);

      expect(onCallCount).toBe(1);

      // Simulate a Postgres change event fired by Supabase
      const payload = { eventType: 'UPDATE', new: { id: 'ord-1', status: 'delivered' } };
      expect(registeredPostgresHandler).toBeDefined();
      registeredPostgresHandler!(payload);

      // Both callbacks must receive the broadcast payload
      expect(cb1).toHaveBeenCalledWith(payload);
      expect(cb2).toHaveBeenCalledWith(payload);

      unsub1();
      unsub2();
    });

    it('(c) unmounting one subscriber leaves the channel alive while the other is still active', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      const config = {
        channelName: 'orders-changes',
        table: 'orders',
        logLabel: 'Orders',
        changeMsg: 'Order changed',
        statusMsg: 'Status changed',
      };

      const unsub1 = registerChannelCallback(config, cb1);
      const unsub2 = registerChannelCallback(config, cb2);

      // Unmount subscriber 2 (e.g. Admin navigating away)
      unsub2();

      // Channel should still be alive in registry with 1 subscriber (Header)
      const registry = __getRealtimeChannelRegistry();
      expect(registry.has('orders-changes')).toBe(true);
      expect(registry.get('orders-changes')?.callbacks.size).toBe(1);
      expect(removeChannelCallCount).toBe(0);

      // Trigger change event: subscriber 1 should still receive it
      const payload = { eventType: 'UPDATE', new: { id: 'ord-2', status: 'processing' } };
      registeredPostgresHandler!(payload);
      expect(cb1).toHaveBeenCalledWith(payload);
      expect(cb2).not.toHaveBeenCalledWith(payload);

      // Now unmount subscriber 1
      unsub1();
    });

    it('(d) unmounting the last subscriber removes the channel and deletes the registry entry', () => {
      const cb1 = vi.fn();

      const config = {
        channelName: 'orders-changes',
        table: 'orders',
        logLabel: 'Orders',
        changeMsg: 'Order changed',
        statusMsg: 'Status changed',
      };

      const unsub1 = registerChannelCallback(config, cb1);
      const registry = __getRealtimeChannelRegistry();
      expect(registry.has('orders-changes')).toBe(true);

      // Unmount the only subscriber
      unsub1();

      // Channel should be cleaned up from registry and Supabase removeChannel invoked
      expect(removeChannelCallCount).toBe(1);
      expect(registry.has('orders-changes')).toBe(false);
    });
  });

  describe('Realtime Product Updates & Leftover Guard', () => {
    beforeEach(() => {
      useStore.setState({
        products: [
          {
            id: 'prod-uuid-1',
            name: 'Savile Midnight Suit',
            description: 'Custom bespoke suit',
            category: 'Suits',
            price: 1250,
            images: ['https://picsum.photos/seed/suit1/600/600'],
            sizes: ['50R'],
            colors: ['Navy'],
            stock: 10,
            rating: 5,
            reviews: [],
          },
        ],
      });
    });

    it('patches product stock by id from realtime payload without adding INITIAL_PRODUCTS leftovers or duplicate items', () => {
      const applyProductChange = useStore.getState().applyProductChange;

      // Simulate realtime UPDATE event for stock change
      applyProductChange({
        eventType: 'UPDATE',
        new: {
          id: 'prod-uuid-1',
          name: 'Savile Midnight Suit',
          stock: 4,
          price: 1250,
          category: 'Suits',
        },
        old: { id: 'prod-uuid-1' },
      });

      const products = useStore.getState().products;
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('prod-uuid-1');
      expect(products[0].stock).toBe(4);
    });

    it('does not resurrect deleted products when receiving an update for an active product', () => {
      const applyProductChange = useStore.getState().applyProductChange;

      // Ensure state only has one active product
      expect(useStore.getState().products).toHaveLength(1);

      // Perform stock edit on the existing product
      applyProductChange({
        eventType: 'UPDATE',
        new: {
          id: 'prod-uuid-1',
          stock: 2,
        },
      });

      const products = useStore.getState().products;
      expect(products).toHaveLength(1);
      expect(products.some((p) => p.id === 'prod-monaco-navy')).toBe(false);
      expect(products[0].stock).toBe(2);
    });
  });

  describe('Realtime Order & Payment Sync', () => {
    beforeEach(() => {
      useStore.setState({
        orders: [
          {
            id: 'ord-uuid-1',
            orderNumber: 'BHD-2001',
            userId: 'user-uuid-1',
            customerName: 'Gentleman Customer',
            customerEmail: 'customer@example.com',
            customerPhone: '+256700000000',
            amount: 350000,
            status: 'Pending',
            date: '2026-08-18T10:00:00Z',
            paymentMethod: 'Mobile Money',
            notes: 'Leave at front desk',
            items: [],
            shippingAddress: { country: 'Uganda', district: 'Kampala', city: 'Lubowa', address: 'Lubowa Showroom' }
          }
        ],
        payments: [
          {
            id: 'pay-uuid-1',
            orderId: 'ord-uuid-1',
            customerName: 'Gentleman Customer',
            customerEmail: 'customer@example.com',
            amount: 350000,
            status: 'Pending',
            paymentMethod: 'Mobile Money',
            transactionId: 'TXN-2001',
            date: '2026-08-18'
          }
        ]
      });
    });

    it('updates order status in realtime on UPDATE event while preserving customer and shipping details', () => {
      const applyOrderChange = useStore.getState().applyOrderChange;

      applyOrderChange({
        eventType: 'UPDATE',
        new: {
          id: 'ord-uuid-1',
          order_number: 'BHD-2001',
          user_id: 'user-uuid-1',
          status: 'processing',
          amount: 350000
        },
        old: { id: 'ord-uuid-1' }
      });

      const orders = useStore.getState().orders;
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('ord-uuid-1');
      expect(orders[0].status).toBe('Processing');
      expect(orders[0].userId).toBe('user-uuid-1');
      expect(orders[0].customerEmail).toBe('customer@example.com');
    });

    it('updates payment status in realtime on UPDATE event', () => {
      const applyPaymentChange = useStore.getState().applyPaymentChange;

      applyPaymentChange({
        eventType: 'UPDATE',
        new: {
          id: 'pay-uuid-1',
          order_id: 'ord-uuid-1',
          status: 'successful',
          amount: 350000,
          transaction_id: 'TXN-2001'
        },
        old: { id: 'pay-uuid-1' }
      });

      const payments = useStore.getState().payments;
      expect(payments).toHaveLength(1);
      expect(payments[0].id).toBe('pay-uuid-1');
      expect(payments[0].status).toBe('Paid');
    });

    it('handles DELETE events for orders and payments in realtime', () => {
      const applyOrderChange = useStore.getState().applyOrderChange;
      const applyPaymentChange = useStore.getState().applyPaymentChange;

      applyOrderChange({
        eventType: 'DELETE',
        old: { id: 'ord-uuid-1' }
      });

      applyPaymentChange({
        eventType: 'DELETE',
        old: { id: 'pay-uuid-1' }
      });

      expect(useStore.getState().orders).toHaveLength(0);
      expect(useStore.getState().payments).toHaveLength(0);
    });
  });
});
