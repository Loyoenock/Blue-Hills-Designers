import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

vi.mock('@upstash/redis', () => {
  return {
    Redis: vi.fn().mockImplementation(function (this: any) {
      return {};
    }),
  };
});

const mockLimit = vi.fn();
vi.mock('@upstash/ratelimit', () => {
  const slidingWindowFn = vi.fn();
  const RatelimitClass = vi.fn().mockImplementation(function (this: any) {
    this.limit = mockLimit;
    return this;
  }) as any;
  RatelimitClass.slidingWindow = slidingWindowFn;
  return {
    Ratelimit: RatelimitClass,
  };
});

describe('checkRateLimit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Local In-Memory Fallback (No Redis configured)', () => {
    it('allows requests within limit', async () => {
      const uniqueIp = `test-ip-within-${Math.random()}`;
      const res = await checkRateLimit(uniqueIp, 5, 60000);
      expect(res.success).toBe(true);
      expect(res.limit).toBe(5);
      expect(res.remaining).toBe(4);
    });

    it('rejects requests over limit', async () => {
      const uniqueIp = `test-ip-over-${Math.random()}`;
      const limit = 2;
      
      const res1 = await checkRateLimit(uniqueIp, limit, 60000);
      expect(res1.success).toBe(true);

      const res2 = await checkRateLimit(uniqueIp, limit, 60000);
      expect(res2.success).toBe(true);

      const res3 = await checkRateLimit(uniqueIp, limit, 60000);
      expect(res3.success).toBe(false);
      expect(res3.remaining).toBe(0);
    });
  });

  describe('Upstash Redis Mode & Error Fail-Open / Fail-Closed Behavior', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    });

    it('returns successful rate limit result when Redis succeeds', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const res = await checkRateLimit('127.0.0.1:upstash-success', 10, 60000);
      expect(res.success).toBe(true);
      expect(res.limit).toBe(10);
      expect(res.remaining).toBe(9);
    });

    it('fails closed (returns success: false) for auth route when Redis throws network error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Connection Failure'));

      const res = await checkRateLimit('test-ip-redis-auth-fallback:/api/auth/login', 10, 60000);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.limit).toBe(10);
    });

    it('fails closed (returns success: false) for gemini route when Redis throws network error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Timeout'));

      const res = await checkRateLimit('test-ip-redis-gemini-fallback:/api/gemini', 10, 60000);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.limit).toBe(10);
    });

    it('fails closed when explicit failClosed option is true on Redis error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Connection Failure'));

      const res = await checkRateLimit('test-ip-custom-route:/api/custom', 10, 60000, { failClosed: true });
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
    });

    it('falls back to in-memory rate limiting for checkout route when Redis throws error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Connection Refused'));

      const res = await checkRateLimit('test-ip-redis-checkout-fallback:/api/checkout', 10, 60000);
      expect(res.success).toBe(true);
      expect(res.limit).toBe(10);
    });

    it('falls back to in-memory rate limiting for products and health routes when Redis throws error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Network error'));
      const resProducts = await checkRateLimit('test-ip-redis-products-fallback:/api/products', 10, 60000);
      expect(resProducts.success).toBe(true);

      mockLimit.mockRejectedValueOnce(new Error('Network error'));
      const resHealth = await checkRateLimit('test-ip-redis-health-fallback:/api/health', 10, 60000);
      expect(resHealth.success).toBe(true);
    });
  });
});
