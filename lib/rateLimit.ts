import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { logger } from './apiUtils';

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

const rateLimitMap = new Map<string, RateLimitRecord>();
let hasWarnedInMemoryFallback = false;

// Clean up expired rate limit entries periodically to prevent memory leaks in local fallback mode
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

let redisClient: Redis | null = null;
const ratelimitCache = new Map<string, Ratelimit>();

function getUpstashRatelimit(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!hasWarnedInMemoryFallback) {
      logger.warn(
        '[RateLimiter] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. Falling back to local in-memory rate limiting. WARNING: In-memory rate limiting is isolated per process and NOT safe for multi-instance production deployments.'
      );
      hasWarnedInMemoryFallback = true;
    }
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  const cacheKey = `${limit}:${windowMs}`;
  if (!ratelimitCache.has(cacheKey)) {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: false,
      prefix: '@upstash/ratelimit',
    });
    ratelimitCache.set(cacheKey, limiter);
  }

  return ratelimitCache.get(cacheKey)!;
}

/**
 * Distributed atomic rate limiting with fallback.
 * Uses Upstash Redis sliding window when configured, or local in-memory Map for single-instance development.
 *
 * @param ip Client IP address or key identifier (e.g. `${ip}:${path}`)
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds (default 1 minute)
 */
export async function checkRateLimit(
  ip: string,
  limit = 60,
  windowMs = 60000
): Promise<RateLimitResult> {
  const ratelimit = getUpstashRatelimit(limit, windowMs);

  if (ratelimit) {
    try {
      const res = await ratelimit.limit(ip);
      const now = Date.now();
      const resetSeconds = Math.max(1, Math.ceil((res.reset - now) / 1000));
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: resetSeconds,
      };
    } catch (err) {
      logger.error('[RateLimiter] Distributed Redis request failed during rate limit check, falling back to in-memory rate limiting:', err);

      /*
       * REDIS OUTAGE FALLBACK POLICY:
       * -----------------------------------------------------------------------------------
       * When Upstash Redis experiences network errors or outages, rate limiting falls back
       * to process-local in-memory sliding window tracking.
       * This allows legitimate authentication (/api/auth/login) and API requests to proceed without
       * causing full outage errors for real users, while still enforcing local rate limit thresholds
       * against brute-force attempts.
       * -----------------------------------------------------------------------------------
       */
    }
  }

  // Local in-memory fallback (for single-instance dev environments)
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
}
