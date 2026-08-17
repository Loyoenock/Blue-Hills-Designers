import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/db/route';

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 600,
    remaining: 599,
  }),
}));

const createDefaultSupabaseClient = () => ({
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseForRequest: vi.fn(),
  getSupabaseAdmin: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/apiUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/apiUtils')>();
  return {
    ...actual,
    authenticate: vi.fn().mockResolvedValue({ id: 'admin-user', role: 'admin' }),
  };
});

describe('DB API Whitelist and Security Safeguards', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getSupabaseForRequest, getSupabaseAdmin } = await import('@/lib/supabase');
    vi.mocked(getSupabaseForRequest).mockReturnValue(createDefaultSupabaseClient() as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
  });

  describe('Action Whitelist Enforcement', () => {
    it('rejects disallowed database actions like "drop" with 400 status', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'drop',
          tableName: 'products',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid action specified');
    });

    it('rejects disallowed database actions like "select" with 400 status', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          tableName: 'products',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid action specified');
    });
  });

  describe('Table Whitelist Enforcement', () => {
    it('rejects access to unauthorized tables like "users" or "secret_keys" with 403 status', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          tableName: 'users',
          payload: { username: 'test' },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Access Denied: Table "users" is not authorized');
    });

    it('rejects access to arbitrary system tables', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          tableName: 'pg_catalog',
          payload: {},
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Access Denied: Table "pg_catalog" is not authorized');
    });

    it('allows upsert on saved_addresses for an authenticated user', async () => {
      const { authenticate } = await import('@/lib/apiUtils');
      const { getSupabaseForRequest } = await import('@/lib/supabase');
      
      const mockUpsertSelect = vi.fn().mockResolvedValue({ data: [{ id: 'addr-1', label: 'Home' }], error: null });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelect });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      vi.mocked(getSupabaseForRequest).mockReturnValue({ from: mockFrom } as any);
      vi.mocked(authenticate).mockResolvedValueOnce({ id: 'customer-uuid-123', role: 'Customer' } as any);

      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-customer-token'
        },
        body: JSON.stringify({
          action: 'upsert',
          tableName: 'saved_addresses',
          payload: {
            user_id: 'customer-uuid-123',
            label: 'Home',
            country: 'Uganda',
            district: 'Kampala',
            city: 'Kampala',
            address: '123 Main St'
          },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).not.toBe(403);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith('saved_addresses');
      expect(mockUpsert).toHaveBeenCalled();
      expect(data.data).toEqual([{ id: 'addr-1', label: 'Home' }]);
    });

    it('rejects saved_addresses upsert for unauthenticated callers per RLS/admin fallback', async () => {
      const { authenticate } = await import('@/lib/apiUtils');
      const { getSupabaseForRequest, getSupabaseAdmin } = await import('@/lib/supabase');

      const rlsError = { message: 'new row violates row-level security policy' };
      const mockUpsertSelect = vi.fn().mockResolvedValue({ data: null, error: rlsError });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelect });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      vi.mocked(getSupabaseForRequest).mockReturnValue({ from: mockFrom } as any);
      vi.mocked(authenticate).mockResolvedValueOnce(null as any);

      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          tableName: 'saved_addresses',
          payload: {
            user_id: 'customer-uuid-123',
            label: 'Home',
            country: 'Uganda',
            district: 'Kampala',
            city: 'Kampala',
            address: '123 Main St'
          },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Security Rejection');
    });

    it('rejects profile upsert self-escalation role change for customer caller with 403 status', async () => {
      const { authenticate } = await import('@/lib/apiUtils');
      const { getSupabaseForRequest } = await import('@/lib/supabase');

      const mockFrom = vi.fn();
      vi.mocked(getSupabaseForRequest).mockReturnValue({ from: mockFrom } as any);
      vi.mocked(authenticate).mockResolvedValueOnce({ id: 'customer-uuid-123', role: 'Customer' } as any);

      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-customer-token'
        },
        body: JSON.stringify({
          action: 'upsert',
          tableName: 'profiles',
          payload: {
            id: 'customer-uuid-123',
            role: 'super admin'
          },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Only Admin or Super Admin accounts are authorized to modify user profiles');
    });

    it('rejects profile upsert when RLS WITH CHECK policy rejects role or status mutation', async () => {
      const { authenticate } = await import('@/lib/apiUtils');
      const { getSupabaseForRequest, getSupabaseAdmin } = await import('@/lib/supabase');

      const rlsError = { message: 'new row violates row-level security policy for table "profiles"' };
      const mockUpsertSelect = vi.fn().mockResolvedValue({ data: null, error: rlsError });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelect });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      vi.mocked(getSupabaseForRequest).mockReturnValue({ from: mockFrom } as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(null);
      vi.mocked(authenticate).mockResolvedValueOnce({ id: 'admin-uuid-123', role: 'Admin' } as any);

      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-admin-token'
        },
        body: JSON.stringify({
          action: 'upsert',
          tableName: 'profiles',
          payload: {
            id: 'target-uuid-456',
            role: 'customer'
          },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Security Rejection');
    });
  });

  describe('Delete Unbounded Filter Safeguards', () => {
    it('rejects delete operation when payload filters are missing with 400 status', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          tableName: 'reviews',
          payload: {},
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Delete filters are required to prevent unbounded mutations');
    });

    it('rejects delete operation when payload filters are an empty object with 400 status', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          tableName: 'reviews',
          payload: { filters: {} },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Delete filters are required to prevent unbounded mutations');
    });

    it('rejects delete operation when filter column keys contain illegal characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          tableName: 'reviews',
          payload: {
            filters: {
              'id; DROP TABLE reviews;--': '123',
            },
          },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid filter column keys provided');
    });
  });
});
