import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSafeImageSrc(src: any): string {
  if (!src || typeof src !== 'string') {
    return 'https://picsum.photos/seed/suit/600/600';
  }
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) {
    return s;
  }
  if (s.startsWith('images/') || s.startsWith('assets/')) {
    return '/' + s;
  }
  return 'https://picsum.photos/seed/suit/600/600';
}

/**
 * Standard utility to verify if a thrown exception/rejection or error state matches
 * network disconnection, database cold-start delay, or a transient connection drop.
 */
export function isNetworkOrConnectionError(err: any): boolean {
  if (!err) return false;
  const nameErr = err.name || '';
  const message = err.message || (typeof err === 'string' ? err : '');
  const status = typeof err.status === 'number' ? err.status : undefined;

  // Client side or API layer error code validation
  if (status !== undefined && status < 500) {
    return false;
  }

  const cleanMsg = message.toLowerCase();
  return (
    (status !== undefined && status >= 500) ||
    nameErr === 'AuthRetryableFetchError' ||
    cleanMsg.includes('database error') ||
    cleanMsg.includes('unexpected_failure') ||
    cleanMsg.includes('fetch') ||
    cleanMsg.includes('network') ||
    cleanMsg.includes('failed to fetch') ||
    cleanMsg.includes('connect') ||
    err.name === 'TypeError'
  );
}
