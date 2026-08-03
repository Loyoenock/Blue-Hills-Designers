import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/db/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    authenticate: vi.fn(),
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Profile Write Authorization (/api/db)', () => {
  let mockSupabaseAdmin: any;
  let mockSupabaseRequest: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'target-uuid' }], error: null })
            })
          };
        }
        return {};
      })
    };

    mockSupabaseRequest = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'target-uuid' }], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'target-uuid' }], error: null })
            })
          };
        }
        return {};
      })
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin);
    vi.spyOn(supabaseLib, 'getSupabaseForRequest').mockReturnValue(mockSupabaseRequest);
  });

  it('(a) Staff caller is rejected on profile upsert with 403 Forbidden', async () => {
    vi.mocked(apiUtils.authenticate).mockResolvedValue({
      id: 'staff-uuid-1',
      email: 'staff@example.com',
      role: 'Staff',
      metadata: {}
    });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'profiles',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          full_name: 'Target User',
          role: 'Customer'
        }
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('Only Admin or Super Admin accounts are authorized to modify user profiles');
  });

  it('(a) Manager caller is rejected on profile upsert with 403 Forbidden', async () => {
    vi.mocked(apiUtils.authenticate).mockResolvedValue({
      id: 'manager-uuid-1',
      email: 'manager@example.com',
      role: 'Manager',
      metadata: {}
    });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'profiles',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'Super Admin'
        }
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('Only Admin or Super Admin accounts are authorized to modify user profiles');
  });

  it('(b) Admin cannot escalate a target role to Super Admin', async () => {
    vi.mocked(apiUtils.authenticate).mockResolvedValue({
      id: 'admin-uuid-1',
      email: 'admin@example.com',
      role: 'Admin',
      metadata: {}
    });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'profiles',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'Super Admin'
        }
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('cannot assign a higher authority role');
  });

  it('(b) Admin cannot modify an existing Super Admin profile', async () => {
    vi.mocked(apiUtils.authenticate).mockResolvedValue({
      id: 'admin-uuid-1',
      email: 'admin@example.com',
      role: 'Admin',
      metadata: {}
    });

    mockSupabaseAdmin.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'superadmin-uuid-1', role: 'Super Admin' },
                error: null
              })
            })
          })
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'profiles',
        payload: {
          id: 'superadmin-uuid-1',
          full_name: 'Attempted Renaming',
          role: 'Admin'
        }
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('cannot modify a user with higher authority');
  });

  it('(c) Super Admin / Admin editing a Staff/Manager/Customer profile succeeds', async () => {
    vi.mocked(apiUtils.authenticate).mockResolvedValue({
      id: 'admin-uuid-1',
      email: 'admin@example.com',
      role: 'Admin',
      metadata: {}
    });

    mockSupabaseAdmin.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'staff-uuid-1', role: 'Staff' },
                error: null
              })
            })
          })
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'profiles',
        payload: {
          id: 'staff-uuid-1',
          full_name: 'Promoted Staff',
          role: 'Manager'
        }
      })
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
  });
});
