import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createAdminUserPOST } from '@/app/api/admin/users/create/route';
import { POST as resetAdminPasswordPOST } from '@/app/api/admin/users/reset-password/route';
import { POST as authLoginPOST } from '@/app/api/auth/login/route';
import { POST as authResetPasswordPOST } from '@/app/api/auth/reset-password/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({ id: 'admin-uuid-1', role: 'Super Admin' }),
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('must_change_password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) admin create user sets must_change_password = true in profile upsert payload', async () => {
    let capturedUpsertPayload: any = null;

    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'usr-new-created-123',
                email: 'newstaff@example.com',
              },
            },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockImplementation((payload: any) => {
              capturedUpsertPayload = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Staff',
        email: 'newstaff@example.com',
        role: 'Staff',
      }),
    });

    const res = await createAdminUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(capturedUpsertPayload).not.toBeNull();
    expect(capturedUpsertPayload.must_change_password).toBe(true);
  });

  it('(b) admin reset password sets must_change_password = true in profiles table', async () => {
    let capturedUpdatePayload: any = null;

    const mockSupabaseAdmin = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'target-user-123', role: 'staff' }, error: null }),
            update: vi.fn().mockImplementation((payload: any) => {
              capturedUpdatePayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'target-user-123',
        password: 'TempPassword123!',
      }),
    });

    const res = await resetAdminPasswordPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(capturedUpdatePayload).not.toBeNull();
    expect(capturedUpdatePayload.must_change_password).toBe(true);
  });

  it('(c) login response includes mustChangePassword flag accurately from profile', async () => {
    const mockSupabaseAuthClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: 'fake-token', refresh_token: 'fake-refresh', expires_in: 3600 },
            user: { id: 'usr-flagged-123', email: 'flagged@example.com', user_metadata: { role: 'Staff' } },
          },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'usr-flagged-123', must_change_password: true },
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAuthClient').mockReturnValue(mockSupabaseAuthClient as any);

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'flagged@example.com',
        password: 'TempPassword123!',
      }),
    });

    const res = await authLoginPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.mustChangePassword).toBe(true);
  });

  it('(d) reset-password route clears must_change_password flag to false on success', async () => {
    let capturedUpdatePayload: any = null;

    const mockSupabaseAdmin = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-changing-pass-123' } },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockImplementation((payload: any) => {
              capturedUpdatePayload = payload;
              return {
                eq: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
              };
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-auth-token',
      },
      body: JSON.stringify({
        password: 'NewPermanentPassword123!',
      }),
    });

    const res = await authResetPasswordPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(capturedUpdatePayload).not.toBeNull();
    expect(capturedUpdatePayload.must_change_password).toBe(false);
  });
});
