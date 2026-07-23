'use client';

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getSupabaseClient } from '../lib/supabase';

export interface RealtimeSyncOptions {
  products?: boolean;
  reviews?: boolean;
  orders?: boolean;
  profiles?: boolean;
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const applyProductChange = useStore((state) => state.applyProductChange);
  const applyReviewChange = useStore((state) => state.applyReviewChange);
  const applyOrderChange = useStore((state) => state.applyOrderChange);
  const applyProfileChange = useStore((state) => state.applyProfileChange);

  const { products, reviews, orders, profiles } = options;

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channels: any[] = [];

    if (products) {
      const prodChannel = supabase
        .channel('public-products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          console.log('Realtime product change received:', payload);
          applyProductChange(payload);
        })
        .subscribe((status) => {
          console.log('Realtime products channel status:', status);
        });
      channels.push(prodChannel);
    }

    if (reviews) {
      const revChannel = supabase
        .channel('public-reviews-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
          console.log('Realtime review change received:', payload);
          applyReviewChange(payload);
        })
        .subscribe((status) => {
          console.log('Realtime reviews channel status:', status);
        });
      channels.push(revChannel);
    }

    if (orders) {
      const ordersChannel = supabase
        .channel('admin-orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          console.log('Admin Realtime order change received:', payload);
          applyOrderChange(payload);
        })
        .subscribe();
      channels.push(ordersChannel);
    }

    if (profiles) {
      const profilesChannel = supabase
        .channel('admin-profiles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          console.log('Admin Realtime profile change received:', payload);
          applyProfileChange(payload);
        })
        .subscribe();
      channels.push(profilesChannel);
    }

    return () => {
      channels.forEach((channel) => {
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [
    products,
    reviews,
    orders,
    profiles,
    applyProductChange,
    applyReviewChange,
    applyOrderChange,
    applyProfileChange,
  ]);
}
