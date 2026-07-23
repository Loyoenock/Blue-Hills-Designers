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

    it('fails closed for sensitive auth route when Redis throws network error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Connection Failure'));

      const res = await checkRateLimit('192.168.1.1:/api/auth/login', 10, 60000);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
    });

    it('fails closed for sensitive gemini route when Redis throws network error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Timeout'));

      const res = await checkRateLimit('192.168.1.1:/api/gemini', 10, 60000);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
    });

    it('fails open for non-sensitive public checkout route when Redis throws error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Redis Connection Refused'));

      const res = await checkRateLimit('192.168.1.1:/api/checkout', 10, 60000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(1);
    });

    it('fails open for non-sensitive db route when Redis throws error', async () => {
      mockLimit.mockRejectedValueOnce(new Error('Network error'));

      const res = await checkRateLimit('192.168.1.1:/api/db', 10, 60000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(1);
    });
  });
});
