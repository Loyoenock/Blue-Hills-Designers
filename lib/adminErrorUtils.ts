/**
 * Helper utilities for Admin Console error classification and retry handling.
 */

export const ADMIN_RELOAD_ATTEMPTS_KEY = 'bhd_admin_reload_count';
export const ADMIN_RELOAD_TIMESTAMP_KEY = 'bhd_admin_reload_time';
export const MAX_ADMIN_AUTO_RELOADS = 2;
export const ADMIN_RELOAD_WINDOW_MS = 30000; // 30 seconds

/**
 * Detects if an error is caused by chunk loading, network hiccups, or script fetch failure.
 */
export function isChunkOrNetworkError(error: any): boolean {
  if (!error) return false;
  const name = String(error?.name || '');
  const message = String(error?.message || '');

  if (name === 'ChunkLoadError') return true;
  if (/loading chunk/i.test(message)) return true;
  if (/failed to fetch/i.test(message)) return true;
  if (/failed to load/i.test(message)) return true;
  if (/importing a module script failed/i.test(message)) return true;
  if (/dynamically imported module/i.test(message)) return true;
  if (name === 'TypeError' && (/fetch|load|network|import|module/i.test(message) || message.includes('Failed to fetch'))) {
    return true;
  }
  return false;
}

/**
 * Calculates whether an automatic reload should be performed given the current history.
 */
export function shouldPerformAutoReload(
  lastTimestamp: number,
  currentCount: number,
  now = Date.now(),
  maxAttempts = MAX_ADMIN_AUTO_RELOADS,
  windowMs = ADMIN_RELOAD_WINDOW_MS
): { shouldReload: boolean; nextCount: number; nextTimestamp: number } {
  // If outside time window, reset counter
  if (!lastTimestamp || (now - lastTimestamp) > windowMs) {
    return {
      shouldReload: true,
      nextCount: 1,
      nextTimestamp: now,
    };
  }

  if (currentCount < maxAttempts) {
    return {
      shouldReload: true,
      nextCount: currentCount + 1,
      nextTimestamp: now,
    };
  }

  return {
    shouldReload: false,
    nextCount: currentCount,
    nextTimestamp: lastTimestamp,
  };
}
