interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired rate limit entries periodically to prevent memory leaks
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

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Basic in-memory rate limiting for Next.js API endpoints.
 * @param ip Client IP address or identifier
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds (default 1 minute)
 */
export function checkRateLimit(ip: string, limit = 60, windowMs = 60000): RateLimitResult {
  const now = Date.now();
  const key = `${ip}`;
  
  let record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  record.count += 1;
  rateLimitMap.set(key, record);
  
  const remaining = Math.max(0, limit - record.count);
  const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
  
  return {
    success: record.count <= limit,
    limit,
    remaining,
    reset: resetSeconds
  };
}
