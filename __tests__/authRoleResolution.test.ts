import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticate, clearRoleCache } from '@/lib/apiUtils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toDisplayRole, toDbRole, normalizeRole } from '@/types';

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/adminBootstrap', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adminBootstrap')>();
  return {
    ...actual,
    isBootstrapAdminEmail: vi.fn((email: string) => email === 'bootstrap@bluehills.com'),
  };
});

describe('Authentication Role Resolution & Spoofing Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRoleCache();
  });

  it('resolves role from profiles table overriding spoofed user_metadata.role', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'spoofer-user-id',
          email: 'spoofer@example.com',
          user_metadata: { role: 'admin' }, // Spoofed role in client metadata
        },
      },
      error: null,
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { role: 'customer' }, // Authoritative DB profile role
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    (getSupabaseAdmin as any).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-valid-token' },
    });

    const result = await authenticate(req);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('spoofer-user-id');
    expect(result?.role).toBe('Customer'); // Must be Customer, NOT spoofed admin
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('recognizes bootstrap admin email as Super Admin', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'bootstrap-user-id',
          email: 'bootstrap@bluehills.com',
          user_metadata: { role: 'Customer' },
        },
      },
      error: null,
    });

    (getSupabaseAdmin as any).mockReturnValue({
      auth: { getUser: mockGetUser },
    });

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-bootstrap-token' },
    });

    const result = await authenticate(req);

    expect(result?.role).toBe('Super Admin');
  });

  it('falls back to user_metadata role when profile row is missing', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
          user_metadata: { role: 'VIP' },
        },
      },
      error: null,
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    (getSupabaseAdmin as any).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-new-token' },
    });

    const result = await authenticate(req);

    expect(result?.role).toBe('VIP');
  });

  it('uses in-memory role cache on subsequent calls', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'cached-user-id',
          email: 'cached@example.com',
          user_metadata: { role: 'customer' },
        },
      },
      error: null,
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    (getSupabaseAdmin as any).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    const req1 = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-token-1' },
    });

    const res1 = await authenticate(req1);
    expect(res1?.role).toBe('Admin');
    expect(mockFrom).toHaveBeenCalledTimes(1);

    // Second request should hit cache and NOT query DB profiles table again
    const req2 = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-token-2' },
    });

    const res2 = await authenticate(req2);
    expect(res2?.role).toBe('Admin');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('performs deterministic round-trip casing between TypeScript display roles and DB CHECK values', () => {
    expect(toDbRole('Super Admin')).toBe('super admin');
    expect(toDisplayRole('super admin')).toBe('Super Admin');

    expect(toDbRole('Admin')).toBe('admin');
    expect(toDisplayRole('admin')).toBe('Admin');

    expect(toDbRole('Customer')).toBe('customer');
    expect(toDisplayRole('customer')).toBe('Customer');

    const normalized = normalizeRole('super admin');
    expect(normalized).toEqual({ display: 'Super Admin', db: 'super admin' });
  });

  it('normalizes lowercase DB profile role string to display format during authentication', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'db-user-id',
          email: 'user@example.com',
          user_metadata: { role: 'customer' },
        },
      },
      error: null,
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { role: 'super admin' }, // DB stores lowercase 'super admin'
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    (getSupabaseAdmin as any).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer mock-db-token' },
    });

    const result = await authenticate(req);
    expect(result?.role).toBe('Super Admin'); // Must be converted to UI display string
  });
});
