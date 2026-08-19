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

type PayloadCallback = (payload: any) => void;

interface ChannelRegistration {
  channelName: string;
  table: string;
  logLabel: string;
  changeMsg: string;
  statusMsg: string;
  channel: any;
  callbacks: Set<PayloadCallback>;
  isSubscribed: boolean;
  currentBackoff: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

// Module-level singleton registry keyed by channel name
const channelRegistry = new Map<string, ChannelRegistration>();

/**
 * Creates and binds a Supabase realtime channel if not already registered,
 * or attaches an additional callback to an existing channel without re-calling .on() / .subscribe().
 * Returns an unsubscription cleanup function.
 */
export function registerChannelCallback(
  config: {
    channelName: string;
    table: string;
    logLabel: string;
    changeMsg: string;
    statusMsg: string;
  },
  callback: PayloadCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  const { channelName, table, logLabel, changeMsg, statusMsg } = config;

  let entry = channelRegistry.get(channelName);

  if (!entry) {
    entry = {
      channelName,
      table,
      logLabel,
      changeMsg,
      statusMsg,
      channel: null,
      callbacks: new Set<PayloadCallback>(),
      isSubscribed: false,
      currentBackoff: 1000,
      retryTimer: null,
    };
    channelRegistry.set(channelName, entry);
  }

  // Register the new callback in the Set
  entry.callbacks.add(callback);

  // If the channel is already active and subscribed, do not bind or subscribe again
  if (entry.isSubscribed && entry.channel) {
    return () => unregisterChannelCallback(channelName, callback);
  }

  const initSubscription = (targetEntry: ChannelRegistration) => {
    if (targetEntry.callbacks.size === 0) {
      return;
    }

    if (targetEntry.retryTimer) {
      clearTimeout(targetEntry.retryTimer);
      targetEntry.retryTimer = null;
    }

    if (targetEntry.channel && supabase) {
      try {
        supabase.removeChannel(targetEntry.channel);
      } catch (err) {
        logger.warn(`Error removing channel ${targetEntry.channelName} during retry:`, { err });
      }
      targetEntry.channel = null;
      targetEntry.isSubscribed = false;
    }

    try {
      const channel = supabase
        .channel(targetEntry.channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: targetEntry.table },
          (payload: any) => {
            logger.info(targetEntry.changeMsg, { payload });
            // Fan out to all active registered callbacks
            targetEntry.callbacks.forEach((cb) => {
              try {
                cb(payload);
              } catch (cbErr) {
                logger.error(`Error in realtime callback for ${targetEntry.channelName}:`, { error: cbErr });
              }
            });
          }
        )
        .subscribe((status: string) => {
          logger.info(targetEntry.statusMsg, { status });

          if (status === 'SUBSCRIBED') {
            targetEntry.currentBackoff = 1000;
            targetEntry.isSubscribed = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (targetEntry.callbacks.size === 0) return;

            logger.warn(
              `${targetEntry.logLabel} channel error or timeout (${status}), retrying in ${targetEntry.currentBackoff}ms...`,
              {
                channelName: targetEntry.channelName,
                status,
                backoffMs: targetEntry.currentBackoff,
              }
            );

            if (targetEntry.retryTimer) clearTimeout(targetEntry.retryTimer);
            const backoffToUse = targetEntry.currentBackoff;
            targetEntry.currentBackoff = Math.min(targetEntry.currentBackoff * 2, 30000);

            targetEntry.retryTimer = setTimeout(() => {
              if (targetEntry.callbacks.size > 0) {
                initSubscription(targetEntry);
              }
            }, backoffToUse);
          }
        });

      targetEntry.channel = channel;
      targetEntry.isSubscribed = true;
    } catch (subErr) {
      logger.error(`Failed to subscribe to realtime channel ${targetEntry.channelName}:`, { error: subErr });
    }
  };

  if (!entry.isSubscribed) {
    initSubscription(entry);
  }

  return () => unregisterChannelCallback(channelName, callback);
}

/**
 * Removes a callback from a channel entry.
 * If no callbacks remain, tears down the Supabase channel and deletes the registry entry.
 */
export function unregisterChannelCallback(channelName: string, callback: PayloadCallback) {
  const entry = channelRegistry.get(channelName);
  if (!entry) return;

  entry.callbacks.delete(callback);

  if (entry.callbacks.size === 0) {
    if (entry.retryTimer) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = null;
    }

    const supabase = getSupabaseClient();
    if (supabase && entry.channel) {
      try {
        supabase.removeChannel(entry.channel);
      } catch (err) {
        logger.warn(`Error removing channel ${channelName} on cleanup:`, { err });
      }
    }

    channelRegistry.delete(channelName);
  }
}

/**
 * Module-level channel registry access for unit test assertions.
 */
export function __getRealtimeChannelRegistry() {
  return channelRegistry;
}

export function __resetRealtimeChannelRegistry() {
  const supabase = getSupabaseClient();
  channelRegistry.forEach((entry) => {
    if (entry.retryTimer) {
      clearTimeout(entry.retryTimer);
    }
    if (supabase && entry.channel) {
      try {
        supabase.removeChannel(entry.channel);
      } catch {}
    }
  });
  channelRegistry.clear();
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const applyProductChange = useStore((state) => state.applyProductChange);
  const applyReviewChange = useStore((state) => state.applyReviewChange);
  const applyOrderChange = useStore((state) => state.applyOrderChange);
  const applyPaymentChange = useStore((state) => state.applyPaymentChange);
  const applyProfileChange = useStore((state) => state.applyProfileChange);

  const { products, reviews, orders, payments, profiles } = options;

  // Stable ref for store callbacks to avoid re-triggering subscription effects
  const handlersRef = useRef({
    applyProductChange,
    applyReviewChange,
    applyOrderChange,
    applyPaymentChange,
    applyProfileChange,
  });

  useEffect(() => {
    handlersRef.current = {
      applyProductChange,
      applyReviewChange,
      applyOrderChange,
      applyPaymentChange,
      applyProfileChange,
    };
  });

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (products) {
      unsubs.push(
        registerChannelCallback(
          {
            channelName: 'public-products-changes',
            table: 'products',
            logLabel: 'Products',
            changeMsg: 'Realtime product change received:',
            statusMsg: 'Realtime products channel status:',
          },
          (payload) => handlersRef.current.applyProductChange(payload)
        )
      );
    }

    if (reviews) {
      unsubs.push(
        registerChannelCallback(
          {
            channelName: 'public-reviews-changes',
            table: 'reviews',
            logLabel: 'Reviews',
            changeMsg: 'Realtime review change received:',
            statusMsg: 'Realtime reviews channel status:',
          },
          (payload) => handlersRef.current.applyReviewChange(payload)
        )
      );
    }

    if (orders) {
      unsubs.push(
        registerChannelCallback(
          {
            channelName: 'orders-changes',
            table: 'orders',
            logLabel: 'Orders',
            changeMsg: 'Realtime order change received:',
            statusMsg: 'Realtime orders channel status:',
          },
          (payload) => handlersRef.current.applyOrderChange(payload)
        )
      );
    }

    if (payments) {
      unsubs.push(
        registerChannelCallback(
          {
            channelName: 'payments-changes',
            table: 'payments',
            logLabel: 'Payments',
            changeMsg: 'Realtime payment change received:',
            statusMsg: 'Realtime payments channel status:',
          },
          (payload) => handlersRef.current.applyPaymentChange(payload)
        )
      );
    }

    if (profiles) {
      unsubs.push(
        registerChannelCallback(
          {
            channelName: 'profiles-changes',
            table: 'profiles',
            logLabel: 'Profiles',
            changeMsg: 'Realtime profile change received:',
            statusMsg: 'Realtime profiles channel status:',
          },
          (payload) => handlersRef.current.applyProfileChange(payload)
        )
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [products, reviews, orders, payments, profiles]);
}
