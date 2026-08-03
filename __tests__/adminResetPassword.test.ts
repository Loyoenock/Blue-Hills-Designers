import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/reset-password/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({ id: 'caller-admin-uuid', role: 'Super Admin' }),
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Admin Reset Password API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) happy path with explicit password', async () => {
    vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-superadmin-uuid', role: 'Super Admin' } as any);

    let updatedPassword: string | null = null;
    const mockSupabaseAdmin = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockImplementation((id: string, attributes: any) => {
            updatedPassword = attributes.password;
            return Promise.resolve({ error: null });
          }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'target-staff-uuid', role: 'Staff' },
                  error: null
                })
              })
            })
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'target-staff-uuid',
        password: 'ExplicitNewPassword123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.temporaryPassword).toBe('ExplicitNewPassword123!');
    expect(updatedPassword).toBe('ExplicitNewPassword123!');
  });

  it('(b) happy path with auto-generated password', async () => {
    vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-superadmin-uuid', role: 'Super Admin' } as any);

    let updatedPassword: string | null = null;
    const mockSupabaseAdmin = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockImplementation((id: string, attributes: any) => {
            updatedPassword = attributes.password;
            return Promise.resolve({ error: null });
          }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'target-staff-uuid', role: 'Staff' },
                  error: null
                })
              })
            })
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'target-staff-uuid',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.temporaryPassword).toMatch(/^BHD-/);
    expect(updatedPassword).toBe(json.temporaryPassword);
  });

  it('(c) rank rejection (Manager caller -> 403)', async () => {
    vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-manager-uuid', role: 'Manager' } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'target-staff-uuid',
        password: 'NewPassword123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/Only Admin or Super Admin/i);
  });

  it('(d) rank rejection (Admin targeting Super Admin -> 403)', async () => {
    vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-admin-uuid', role: 'Admin' } as any);

    const mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'target-superadmin-uuid', role: 'Super Admin' },
                  error: null
                })
              })
            })
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'target-superadmin-uuid',
        password: 'NewPassword123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/cannot reset the password/i);
  });

  it('(e) self-reset rejection', async () => {
    vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-admin-uuid', role: 'Admin' } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'caller-admin-uuid',
        password: 'NewPassword123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/cannot reset your own password/i);
  });
});
