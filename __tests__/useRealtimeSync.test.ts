import { describe, it, expect, beforeEach } from 'vitest';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useStore } from '@/store/useStore';

describe('useRealtimeSync Hook Module', () => {
  it('exports useRealtimeSync function correctly', () => {
    expect(typeof useRealtimeSync).toBe('function');
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

