import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "./apiUtils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSafeImageSrc(src: any): string {
  if (!src || typeof src !== 'string') {
    return 'https://picsum.photos/seed/suit/600/600';
  }
  let s = src.trim();
  if (!s) {
    return 'https://picsum.photos/seed/suit/600/600';
  }

  // Handle Supabase signed or authenticated object URLs
  if (s.includes('/storage/v1/object/sign/') || s.includes('/storage/v1/object/authenticated/')) {
    try {
      const urlObj = new URL(s);
      let pathname = urlObj.pathname;
      pathname = pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
      pathname = pathname.replace('/storage/v1/object/authenticated/', '/storage/v1/object/public/');
      return `${urlObj.origin}${pathname}`;
    } catch (e) {
      // Fall through if URL parsing fails
    }
  }

  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) {
    return s;
  }
  if (s.startsWith('images/') || s.startsWith('assets/')) {
    return '/' + s;
  }
  
  // Handle Supabase Storage object paths
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (supabaseUrl) {
      const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
      let cleanPath = s;
      if (cleanPath.startsWith('app-file/')) {
        cleanPath = cleanPath.substring('app-file/'.length);
      }
      return `${baseUrl}/storage/v1/object/public/app-file/${cleanPath}`;
    }
  } catch (err) {
    logger.error('Error generating Supabase public URL in getSafeImageSrc:', err);
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
