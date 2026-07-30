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
});

