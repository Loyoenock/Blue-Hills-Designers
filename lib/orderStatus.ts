import { Order } from '../types';

/**
 * Maps a UI order status ('Pending' | 'Processing' | 'Delivered' | 'Cancelled')
 * to the Supabase database CHECK constraint status ('pending' | 'processing' | 'completed' | 'cancelled').
 */
export function toDbOrderStatus(uiStatus: Order['status'] | string | undefined | null): string {
  if (!uiStatus) return 'pending';
  const s = String(uiStatus).trim().toLowerCase();
  if (s === 'delivered' || s === 'completed') return 'completed';
  if (s === 'processing') return 'processing';
  if (s === 'cancelled') return 'cancelled';
  return 'pending';
}

/**
 * Maps a Supabase database order status ('pending' | 'processing' | 'completed' | 'cancelled')
 * to the UI order status ('Pending' | 'Processing' | 'Delivered' | 'Cancelled').
 */
export function toUiOrderStatus(dbStatus: string | undefined | null): Order['status'] {
  if (!dbStatus) return 'Pending';
  const s = String(dbStatus).trim().toLowerCase();
  if (s === 'completed' || s === 'delivered') return 'Delivered';
  if (s === 'processing') return 'Processing';
  if (s === 'cancelled') return 'Cancelled';
  return 'Pending';
}
