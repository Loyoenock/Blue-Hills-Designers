import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/create/route';
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

describe('Admin Create User API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts profiles payload without any unrecognized "name" column', async () => {
    let capturedUpsertPayload: any = null;

    const mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'jane@example.com',
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
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
        role: 'Manager',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.name).toBe('Jane Doe');
    expect(json.user.id).toBe('123e4567-e89b-12d3-a456-426614174000');

    // Crucial regression check: profilePayload passed to upsert must NOT contain 'name'
    expect(capturedUpsertPayload).not.toBeNull();
    expect(capturedUpsertPayload).not.toHaveProperty('name');
    expect(capturedUpsertPayload).toHaveProperty('full_name', 'Jane Doe');
    expect(capturedUpsertPayload).toHaveProperty('email', 'jane@example.com');
  });
});
