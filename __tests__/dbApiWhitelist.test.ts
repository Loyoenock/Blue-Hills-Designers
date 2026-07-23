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

vi.mock('@/lib/supabase', () => ({
  getSupabaseForRequest: vi.fn().mockReturnValue({
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
  }),
}));

vi.mock('@/lib/apiUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/apiUtils')>();
  return {
    ...actual,
    authenticate: vi.fn().mockResolvedValue({ id: 'admin-user', role: 'admin' }),
  };
});

describe('DB API Whitelist and Security Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
