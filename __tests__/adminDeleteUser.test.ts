import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/delete/route';
import * as apiUtils from '@/lib/apiUtils';
import * as supabaseLib from '@/lib/supabase';
import { useStore } from '@/store/useStore';

vi.mock('@/lib/apiUtils', async () => {
  const actual = await vi.importActual<typeof apiUtils>('@/lib/apiUtils');
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({ id: 'caller-admin-uuid', role: 'Super Admin' }),
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Admin User Deletion API Route & Store Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Route /api/admin/users/delete', () => {
    it('(a) happy path: Super Admin deletes user, removing auth account and profile row', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-superadmin-uuid', role: 'Super Admin' } as any);

      let deletedAuthUserId: string | null = null;
      let deletedProfileId: string | null = null;

      const mockSupabaseAdmin = {
        auth: {
          admin: {
            deleteUser: vi.fn().mockImplementation((id: string) => {
              deletedAuthUserId = id;
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
                    data: { id: 'target-customer-uuid', role: 'Customer', email: 'customer@example.com' },
                    error: null
                  })
                })
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  deletedProfileId = val;
                  return Promise.resolve({ error: null });
                })
              })
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'target-customer-uuid',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(deletedAuthUserId).toBe('target-customer-uuid');
      expect(deletedProfileId).toBe('target-customer-uuid');
    });

    it('(b) handles orphaned auth user gracefully (auth not found -> proceeds with profile deletion and succeeds)', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-superadmin-uuid', role: 'Super Admin' } as any);

      let deletedProfileId: string | null = null;

      const mockSupabaseAdmin = {
        auth: {
          admin: {
            deleteUser: vi.fn().mockResolvedValue({
              error: { message: 'User not found', status: 404 }
            }),
          },
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'target-orphan-uuid', role: 'Customer' },
                    error: null
                  })
                })
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  deletedProfileId = val;
                  return Promise.resolve({ error: null });
                })
              })
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'target-orphan-uuid',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(deletedProfileId).toBe('target-orphan-uuid');
    });

    it('(c) rejects self-deletion attempts with 403', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-admin-uuid', role: 'Admin' } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'caller-admin-uuid',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toMatch(/cannot delete your own account/i);
    });

    it('(d) rejects callers with insufficient role tier (Manager / Staff / Customer)', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-manager-uuid', role: 'Manager' } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'target-user-uuid',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toMatch(/Only Admin or Super Admin accounts are authorized/i);
    });

    it('(e) rejects deletion of target with higher authority rank (Admin caller targeting Super Admin)', async () => {
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

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'target-superadmin-uuid',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toMatch(/cannot delete a user with higher authority/i);
    });

    it('(f) rejects missing userId with 400', async () => {
      vi.spyOn(apiUtils, 'requireAuth').mockResolvedValueOnce({ id: 'caller-admin-uuid', role: 'Admin' } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/User ID is required/i);
    });
  });

  describe('Zustand store adminDeleteUser behavior', () => {
    it('optimistically removes user and rolls back state when endpoint fails', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const initialUsers = [
        { id: validUuid, name: 'Test User', email: 'test@example.com', role: 'Customer' as const, spending: 0, rewardsPoints: 0, source: 'db' as const }
      ];

      useStore.setState({ users: initialUsers, adminError: null });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Forbidden: Unauthorized deletion.' })
      } as any);

      const result = await useStore.getState().adminDeleteUser(validUuid, 'Master Admin', 'Super Admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Forbidden: Unauthorized deletion.');
      // State should be rolled back to include the user
      expect(useStore.getState().users.some(u => u.id === validUuid)).toBe(true);
    });

    it('successfully deletes user and keeps state updated when endpoint succeeds', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174001';
      const initialUsers = [
        { id: validUuid, name: 'Test User 2', email: 'test2@example.com', role: 'Customer' as const, spending: 0, rewardsPoints: 0, source: 'db' as const }
      ];

      useStore.setState({ users: initialUsers, adminError: null });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as any);

      const result = await useStore.getState().adminDeleteUser(validUuid, 'Master Admin', 'Super Admin');

      expect(result.success).toBe(true);
      expect(useStore.getState().users.some(u => u.id === validUuid)).toBe(false);
    });
  });
});
