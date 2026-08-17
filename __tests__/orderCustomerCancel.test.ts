import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/db/route';
import { authenticate } from '@/lib/apiUtils';
import { getSupabaseAdmin } from '@/lib/supabase';

vi.mock('@/lib/rateLimit', () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 600,
    remaining: 599,
  }),
}));

const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'order-1', status: 'Cancelled' }], error: null }),
    }),
  }),
};

vi.mock('@/lib/supabase', () => ({
  getSupabaseForRequest: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/apiUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/apiUtils')>();
  return {
    ...actual,
    authenticate: vi.fn(),
  };
});

describe('Customer Order Cancellation API Guard', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getSupabaseForRequest } = await import('@/lib/supabase');
    vi.mocked(getSupabaseForRequest).mockReturnValue(mockSupabaseClient as any);
  });

  it("rejects a non-owner customer trying to cancel another user's order with 403", async () => {
    vi.mocked(authenticate).mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', email: 'user@example.com', role: 'Customer', metadata: {} });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: '11111111-1111-4111-8111-111111111111', user_id: '123e4567-e89b-42d3-a456-426614174001', status: 'pending' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'orders',
        payload: { id: '11111111-1111-4111-8111-111111111111', status: 'cancelled' },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Forbidden: you may only cancel your own orders');
  });

  it('rejects a customer attempting to set status to anything other than cancelled with 403', async () => {
    vi.mocked(authenticate).mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', email: 'user@example.com', role: 'Customer', metadata: {} });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: '11111111-1111-4111-8111-111111111111', user_id: '123e4567-e89b-42d3-a456-426614174000', status: 'pending' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'orders',
        payload: { id: '11111111-1111-4111-8111-111111111111', status: 'Delivered' },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Forbidden: customers may only cancel an order, not set other statuses.');
  });

  it('rejects cancelling an order that is already Delivered/Cancelled with 403', async () => {
    vi.mocked(authenticate).mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', email: 'user@example.com', role: 'Customer', metadata: {} });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: '11111111-1111-4111-8111-111111111111', user_id: '123e4567-e89b-42d3-a456-426614174000', status: 'delivered' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'orders',
        payload: { id: '11111111-1111-4111-8111-111111111111', status: 'cancelled' },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Forbidden: an order that is already 'delivered' cannot be cancelled here.");
  });

  it('allows a customer to cancel their own Pending order and returns success', async () => {
    vi.mocked(authenticate).mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', email: 'user@example.com', role: 'Customer', metadata: {} });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: '11111111-1111-4111-8111-111111111111', user_id: '123e4567-e89b-42d3-a456-426614174000', status: 'pending' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'orders',
        payload: { id: '11111111-1111-4111-8111-111111111111', status: 'cancelled' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('leaves admin/staff upsert on orders unaffected by the new guard', async () => {
    vi.mocked(authenticate).mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174002', email: 'admin@example.com', role: 'Admin', metadata: {} });

    const req = new NextRequest('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        tableName: 'orders',
        payload: { id: '11111111-1111-4111-8111-111111111111', status: 'Delivered' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
