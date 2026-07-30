import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('Auth Login Route & Error Response Precision', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns explicit 503 error when Supabase URL or ANON key is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'loyoenock@gmail.com', password: 'password123' }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Authentication is not configured');
  });

  it('returns 400 with invalid email message when email field is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('valid email address');
  });
});
