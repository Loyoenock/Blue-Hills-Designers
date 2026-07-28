'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getSupabaseClient } from '../lib/supabase';
import { logger } from '../lib/apiUtils';

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

  const activeCleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    activeCleanupRef.current = [];

    const setupSubscription = (
      channelName: string,
      table: string,
      logLabel: string,
      changeMsg: string,
      statusMsg: string,
      onPayload: (payload: any) => void
    ) => {
      let currentBackoff = 1000;
      let timerId: NodeJS.Timeout | null = null;
      let currentChannel: any = null;
      let isCancelled = false;

      const cleanupCurrent = () => {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        if (currentChannel && supabase) {
          supabase.removeChannel(currentChannel);
          currentChannel = null;
        }
      };

      const subscribe = () => {
        if (isCancelled) return;

        cleanupCurrent();

        currentChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            (payload) => {
              logger.info(changeMsg, { payload });
              onPayload(payload);
            }
          )
          .subscribe((status) => {
            logger.info(statusMsg, { status });

            if (status === 'SUBSCRIBED') {
              currentBackoff = 1000;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (isCancelled) return;
              logger.warn(`${logLabel} channel error or timeout (${status}), retrying in ${currentBackoff}ms...`, {
                channelName,
                status,
                backoffMs: currentBackoff,
              });

              if (timerId) clearTimeout(timerId);
              const backoffToUse = currentBackoff;
              currentBackoff = Math.min(currentBackoff * 2, 30000);

              timerId = setTimeout(() => {
                if (!isCancelled) {
                  subscribe();
                }
              }, backoffToUse);
            }
          });
      };

      subscribe();

      const unsubscribe = () => {
        isCancelled = true;
        cleanupCurrent();
      };

      activeCleanupRef.current.push(unsubscribe);
    };

    if (products) {
      setupSubscription(
        'public-products-changes',
        'products',
        'Products',
        'Realtime product change received:',
        'Realtime products channel status:',
        applyProductChange
      );
    }

    if (reviews) {
      setupSubscription(
        'public-reviews-changes',
        'reviews',
        'Reviews',
        'Realtime review change received:',
        'Realtime reviews channel status:',
        applyReviewChange
      );
    }

    if (orders) {
      setupSubscription(
        'admin-orders-changes',
        'orders',
        'Orders',
        'Admin Realtime order change received:',
        'Admin Realtime order channel status:',
        applyOrderChange
      );
    }

    if (profiles) {
      setupSubscription(
        'admin-profiles-changes',
        'profiles',
        'Profiles',
        'Admin Realtime profile change received:',
        'Admin Realtime profile channel status:',
        applyProfileChange
      );
    }

    return () => {
      activeCleanupRef.current.forEach((cleanup) => cleanup());
      activeCleanupRef.current = [];
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

