import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Auth Registration & Orphan Recovery Route /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates a brand-new user on happy path', async () => {
    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'new-user-uuid',
                email: 'newuser@example.com',
                user_metadata: { name: 'New User', role: 'Customer' }
              }
            },
            error: null
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'newuser@example.com',
        phone: '+256700000000',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.email).toBe('newuser@example.com');
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it('recovers from an orphaned auth record (no profile in public.profiles) by hard-deleting and retrying createUser', async () => {
    let deleteUserCalledWith: any = null;
    let createCallCount = 0;

    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockImplementation(() => {
            createCallCount++;
            if (createCallCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'An account with this email address has already been registered' }
              });
            }
            return Promise.resolve({
              data: {
                user: {
                  id: 'recovered-user-uuid',
                  email: 'recreated@example.com',
                  user_metadata: { name: 'Recreated User', role: 'Customer' }
                }
              },
              error: null
            });
          }),
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: 'stale-orphan-uuid',
                  email: 'recreated@example.com',
                  created_at: '2026-08-01T00:00:00Z'
                }
              ]
            },
            error: null
          }),
          deleteUser: vi.fn().mockImplementation((id: string, shouldSoftDelete?: boolean) => {
            deleteUserCalledWith = { id, shouldSoftDelete };
            return Promise.resolve({ error: null });
          }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }),
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          };
        }
        return {};
      })
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Recreated User',
        email: 'recreated@example.com',
        phone: '+256700000000',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.id).toBe('recovered-user-uuid');
    expect(deleteUserCalledWith).toEqual({ id: 'stale-orphan-uuid', shouldSoftDelete: false });
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledTimes(2);
  });

  it('rejects registration for an active user with an existing public.profiles row', async () => {
    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'An account with this email address has already been registered' }
          }),
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: 'active-user-uuid',
                  email: 'active@example.com',
                  deleted_at: null
                }
              ]
            },
            error: null
          }),
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'active-user-uuid', email: 'active@example.com', role: 'Customer' },
                  error: null
                })
              }),
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'active-user-uuid', email: 'active@example.com', role: 'Customer' },
                  error: null
                })
              })
            })
          };
        }
        return {};
      })
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Active User',
        email: 'active@example.com',
        phone: '+256700000000',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/already been registered/i);
    expect(mockSupabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it('handles bootstrap admin email re-registration by updating password and metadata', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = 'bootstrap.owner@bluehills.ug';

    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'already registered' }
          }),
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: 'bootstrap-admin-uuid',
                  email: 'bootstrap.owner@bluehills.ug',
                  user_metadata: { name: 'Owner', role: 'Super Admin' }
                }
              ]
            },
            error: null
          }),
          updateUserById: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'bootstrap-admin-uuid',
                email: 'bootstrap.owner@bluehills.ug',
                user_metadata: { name: 'Owner Updated', role: 'Super Admin' }
              }
            },
            error: null
          }),
          deleteUser: vi.fn(),
        },
      },
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Owner Updated',
        email: 'bootstrap.owner@bluehills.ug',
        phone: '+256700000000',
        password: 'NewBootstrapPassword123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.email).toBe('bootstrap.owner@bluehills.ug');
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'bootstrap-admin-uuid',
      expect.objectContaining({
        password: 'NewBootstrapPassword123!',
      })
    );
    expect(mockSupabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
