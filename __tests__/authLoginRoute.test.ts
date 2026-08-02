import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';
import * as supabaseLib from '@/lib/supabase';

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

  it('never returns success when logging in with an attacker email pattern like admin@attacker.com and wrong password', async () => {
    process.env.SUPABASE_URL = 'https://fake-supabase.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'fake-anon-key';

    const mockAuthClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        }),
      },
    };

    vi.spyOn(supabaseLib, 'getSupabaseAuthClient').mockReturnValue(mockAuthClient as any);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@attacker.com', password: 'wrongpassword' }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid login credentials');
  });

  it('never calls updateUserById when logging in with an existing bootstrap email and wrong password', async () => {
    process.env.SUPABASE_URL = 'https://fake-supabase.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'fake-anon-key';

    const mockAuthClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        }),
      },
    };

    const updateUserByIdMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered', status: 400 },
          }),
          updateUserById: updateUserByIdMock,
        },
      },
    };

    vi.spyOn(supabaseLib, 'getSupabaseAuthClient').mockReturnValue(mockAuthClient as any);
    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockAdminClient as any);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bluehills.com', password: 'wrongpassword123' }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});
