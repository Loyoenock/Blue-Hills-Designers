import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

describe('checkRateLimit (In-Memory Sliding Window)', () => {
  it('allows requests within limit and decrements remaining quota', async () => {
    const uniqueIp = `test-ip-within-${Math.random()}`;
    const limit = 5;

    const res1 = await checkRateLimit(uniqueIp, limit, 60000);
    expect(res1.success).toBe(true);
    expect(res1.limit).toBe(limit);
    expect(res1.remaining).toBe(4);
    expect(res1.reset).toBeGreaterThanOrEqual(1);

    const res2 = await checkRateLimit(uniqueIp, limit, 60000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it('rejects requests that exceed the configured limit', async () => {
    const uniqueIp = `test-ip-over-${Math.random()}`;
    const limit = 2;

    const res1 = await checkRateLimit(uniqueIp, limit, 60000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await checkRateLimit(uniqueIp, limit, 60000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await checkRateLimit(uniqueIp, limit, 60000);
    expect(res3.success).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.limit).toBe(limit);
  });

  it('maintains independent rate limit counters for distinct keys/IPs', async () => {
    const ipA = `test-ip-a-${Math.random()}`;
    const ipB = `test-ip-b-${Math.random()}`;

    const resA = await checkRateLimit(ipA, 1, 60000);
    expect(resA.success).toBe(true);

    const resA2 = await checkRateLimit(ipA, 1, 60000);
    expect(resA2.success).toBe(false);

    const resB = await checkRateLimit(ipB, 1, 60000);
    expect(resB.success).toBe(true);
  });

  it('handles security-sensitive route identifiers with fail-closed configuration', async () => {
    const authKey = `127.0.0.1:/api/auth/login`;
    const resAuth = await checkRateLimit(authKey, 10, 60000);
    expect(resAuth.success).toBe(true);

    const geminiKey = `127.0.0.1:/api/gemini`;
    const resGemini = await checkRateLimit(geminiKey, 10, 60000);
    expect(resGemini.success).toBe(true);
  });

  it('resets window after duration passes', async () => {
    const uniqueIp = `test-ip-reset-${Math.random()}`;
    const windowMs = 50; // short window for test

    const res1 = await checkRateLimit(uniqueIp, 1, windowMs);
    expect(res1.success).toBe(true);

    const res2 = await checkRateLimit(uniqueIp, 1, windowMs);
    expect(res2.success).toBe(false);

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const res3 = await checkRateLimit(uniqueIp, 1, windowMs);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });
});
