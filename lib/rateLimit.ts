export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  failClosed?: boolean;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired rate limit entries periodically to prevent memory leaks in process-local in-memory mode
if (typeof global !== 'undefined') {
  const intervalId = (global as any).__rateLimitCleanupInterval;
  if (intervalId) {
    clearInterval(intervalId);
  }
  (global as any).__rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Process-local in-memory sliding window rate limiting.
 * Tracks request counts per key within a given time window.
 * Suitable for single-instance or low-traffic deployments.
 *
 * @param ip Client IP address or key identifier (e.g. `${ip}:${path}`)
 * @param limit Max requests allowed in the window (default: 60)
 * @param windowMs Time window in milliseconds (default: 60000)
 * @param options Additional options, e.g. { failClosed: true }
 */
export async function checkRateLimit(
  ip: string,
  limit = 60,
  windowMs = 60000,
  options?: RateLimitOptions | boolean
): Promise<RateLimitResult> {
  const normalizedIp = ip.toLowerCase();
  const isExplicitFailClosed = typeof options === 'boolean' ? options : options?.failClosed === true;
  const isFailClosed =
    isExplicitFailClosed ||
    normalizedIp.includes('/api/auth') ||
    normalizedIp.includes('/api/gemini') ||
    normalizedIp.includes('auth') ||
    normalizedIp.includes('gemini');

  try {
    const now = Date.now();
    const key = `${ip}`;

    let record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    record.count += 1;
    rateLimitMap.set(key, record);

    const remaining = Math.max(0, limit - record.count);
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    return {
      success: record.count <= limit,
      limit,
      remaining,
      reset: resetSeconds,
    };
  } catch (_err) {
    if (isFailClosed) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }
    return {
      success: true,
      limit,
      remaining: 1,
      reset: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }
}
