'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getSupabaseClient } from '../lib/supabase';
import { logger } from '../lib/apiUtils';

export interface RealtimeSyncOptions {
  products?: boolean;
  reviews?: boolean;
  orders?: boolean;
  payments?: boolean;
  profiles?: boolean;
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const applyProductChange = useStore((state) => state.applyProductChange);
  const applyReviewChange = useStore((state) => state.applyReviewChange);
  const applyOrderChange = useStore((state) => state.applyOrderChange);
  const applyPaymentChange = useStore((state) => state.applyPaymentChange);
  const applyProfileChange = useStore((state) => state.applyProfileChange);

  const { products, reviews, orders, payments, profiles } = options;

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
        'orders-changes',
        'orders',
        'Orders',
        'Realtime order change received:',
        'Realtime orders channel status:',
        applyOrderChange
      );
    }

    if (payments) {
      setupSubscription(
        'payments-changes',
        'payments',
        'Payments',
        'Realtime payment change received:',
        'Realtime payments channel status:',
        applyPaymentChange
      );
    }

    if (profiles) {
      setupSubscription(
        'profiles-changes',
        'profiles',
        'Profiles',
        'Realtime profile change received:',
        'Realtime profiles channel status:',
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
    payments,
    profiles,
    applyProductChange,
    applyReviewChange,
    applyOrderChange,
    applyPaymentChange,
    applyProfileChange,
  ]);
}

